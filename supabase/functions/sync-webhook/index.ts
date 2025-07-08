import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-source-system',
};

interface WebhookPayload {
  event: 'insert' | 'update' | 'delete' | 'sync';
  table: string;
  data: any;
  old_data?: any;
  timestamp: string;
  source_system: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const startTime = Date.now();
    const payload: WebhookPayload = await req.json();
    
    console.log('Webhook recebido:', {
      event: payload.event,
      table: payload.table,
      source: payload.source_system,
      timestamp: payload.timestamp
    });

    // Validar assinatura do webhook
    const signature = req.headers.get('x-webhook-signature');
    const sourceSystem = req.headers.get('x-source-system') || payload.source_system;
    
    if (!await validateWebhookSignature(supabase, signature, sourceSystem, payload)) {
      console.error('Assinatura inválida');
      return new Response('Invalid signature', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // Registrar tentativa de sincronização
    const { data: logEntry } = await supabase
      .from('sync_logs')
      .insert({
        operation_type: payload.event,
        table_name: payload.table,
        record_id: payload.data?.id || payload.data?.numero_venda || payload.data?.numero_contrato || 'unknown',
        source_system: sourceSystem,
        status: 'pending',
        data_payload: payload,
        retry_count: 0,
      })
      .select()
      .single();

    if (!logEntry) {
      throw new Error('Falha ao criar log de sincronização');
    }

    // Processar dados baseado na tabela
    let result;
    switch (payload.table.toLowerCase()) {
      case 'clientes':
        result = await syncCliente(supabase, payload);
        break;
      case 'vendas':
        result = await syncVenda(supabase, payload);
        break;
      case 'contratos':
        result = await syncContrato(supabase, payload);
        break;
      case 'contas_receber':
      case 'financeiro':
        result = await syncFinanceiro(supabase, payload);
        break;
      default:
        throw new Error(`Tabela não suportada: ${payload.table}`);
    }

    const executionTime = Date.now() - startTime;

    // Atualizar log de sucesso
    await supabase
      .from('sync_logs')
      .update({
        status: 'success',
        processed_at: new Date().toISOString(),
        execution_time_ms: executionTime
      })
      .eq('id', logEntry.id);

    console.log('Sincronização bem-sucedida:', {
      syncId: logEntry.id,
      executionTime: `${executionTime}ms`,
      result: result
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Sincronização realizada com sucesso',
      sync_id: logEntry.id,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateWebhookSignature(supabase: any, signature: string | null, sourceSystem: string, payload: any): Promise<boolean> {
  if (!signature || !sourceSystem) {
    console.error('Assinatura ou sistema de origem ausente');
    return false;
  }

  // Buscar configuração do webhook
  const { data: config } = await supabase
    .from('webhook_configs')
    .select('webhook_secret, active')
    .eq('target_system', sourceSystem)
    .eq('active', true)
    .single();

  if (!config) {
    console.error('Configuração de webhook não encontrada para:', sourceSystem);
    return false;
  }

  try {
    // Gerar assinatura esperada
    const expectedSignature = await generateSignature(JSON.stringify(payload), config.webhook_secret);
    const providedSignature = signature.replace('sha256=', '');
    
    return expectedSignature === providedSignature;
  } catch (error) {
    console.error('Erro na validação de assinatura:', error);
    return false;
  }
}

async function generateSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function syncCliente(supabase: any, payload: WebhookPayload) {
  const { event, data } = payload;
  
  console.log(`Sincronizando cliente - Evento: ${event}`, data);
  
  switch (event) {
    case 'insert':
    case 'sync':
      // Verificar se cliente já existe
      const { data: existingCliente } = await supabase
        .from('clientes')
        .select('id')
        .or(`cpf_cnpj.eq.${data.cpf_cnpj},external_id.eq.${data.id}`)
        .single();
      
      if (existingCliente) {
        console.log('Cliente já existe, fazendo update');
        return await supabase
          .from('clientes')
          .update({
            ...mapClienteData(data, payload.source_system),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCliente.id)
          .select()
          .single();
      }
      
      return await supabase
        .from('clientes')
        .insert(mapClienteData(data, payload.source_system))
        .select()
        .single();
        
    case 'update':
      return await supabase
        .from('clientes')
        .update({
          ...mapClienteData(data, payload.source_system),
          updated_at: new Date().toISOString()
        })
        .eq('external_id', data.id)
        .select()
        .single();
        
    case 'delete':
      return await supabase
        .from('clientes')
        .update({
          ativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('external_id', data.id)
        .select()
        .single();
  }
}

async function syncVenda(supabase: any, payload: WebhookPayload) {
  const { event, data } = payload;
  
  console.log(`Sincronizando venda - Evento: ${event}`, data);
  
  // Buscar cliente pelo ID externo ou CPF/CNPJ
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .single();
    
    clienteId = cliente?.id;
  }
  
  const vendaData = {
    numero_venda: data.numero_venda || data.id,
    cliente_id: clienteId,
    data_venda: data.data_venda || new Date().toISOString(),
    valor_total: data.valor_total || data.total,
    valor_desconto: data.valor_desconto || 0,
    valor_acrescimo: data.valor_acrescimo || 0,
    itens: data.itens || [],
    forma_pagamento: data.forma_pagamento,
    status: data.status || 'finalizada',
    observacoes: data.observacoes,
    source_system: payload.source_system,
    sync_metadata: {
      external_id: data.id,
      synchronized_at: new Date().toISOString(),
      source_data: data
    }
  };
  
  switch (event) {
    case 'insert':
    case 'sync':
      return await supabase
        .from('vendas')
        .insert(vendaData)
        .select()
        .single();
        
    case 'update':
      return await supabase
        .from('vendas')
        .update({
          ...vendaData,
          updated_at: new Date().toISOString()
        })
        .eq('numero_venda', data.numero_venda || data.id)
        .select()
        .single();
  }
}

async function syncContrato(supabase: any, payload: WebhookPayload) {
  const { event, data } = payload;
  
  console.log(`Sincronizando contrato - Evento: ${event}`, data);
  
  // Buscar cliente
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .single();
    
    clienteId = cliente?.id;
  }
  
  const contratoData = {
    numero_contrato: data.numero_contrato || data.id,
    cliente_id: clienteId,
    data_inicio: data.data_inicio,
    data_fim: data.data_fim,
    valor_mensal: data.valor_mensal,
    valor_total: data.valor_total,
    status: data.status || 'ativo',
    servicos: data.servicos || [],
    observacoes: data.observacoes,
    responsavel: data.responsavel,
    source_system: payload.source_system,
    sync_metadata: {
      external_id: data.id,
      synchronized_at: new Date().toISOString(),
      source_data: data
    }
  };
  
  switch (event) {
    case 'insert':
    case 'sync':
      return await supabase
        .from('contratos')
        .insert(contratoData)
        .select()
        .single();
        
    case 'update':
      return await supabase
        .from('contratos')
        .update({
          ...contratoData,
          updated_at: new Date().toISOString()
        })
        .eq('numero_contrato', data.numero_contrato || data.id)
        .select()
        .single();
  }
}

async function syncFinanceiro(supabase: any, payload: WebhookPayload) {
  const { event, data } = payload;
  
  console.log(`Sincronizando financeiro - Evento: ${event}`, data);
  
  // Buscar cliente, venda e contrato relacionados
  let clienteId = null, vendaId = null, contratoId = null;
  
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .single();
    clienteId = cliente?.id;
  }
  
  if (data.venda_id) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('id')
      .eq('numero_venda', data.venda_id)
      .single();
    vendaId = venda?.id;
  }
  
  if (data.contrato_id) {
    const { data: contrato } = await supabase
      .from('contratos')
      .select('id')
      .eq('numero_contrato', data.contrato_id)
      .single();
    contratoId = contrato?.id;
  }
  
  const financeiroData = {
    numero_documento: data.numero_documento || data.id,
    cliente_id: clienteId,
    venda_id: vendaId,
    contrato_id: contratoId,
    data_emissao: data.data_emissao || new Date().toISOString().split('T')[0],
    data_vencimento: data.data_vencimento,
    data_pagamento: data.data_pagamento,
    valor_original: data.valor_original || data.valor,
    valor_pago: data.valor_pago || 0,
    valor_desconto: data.valor_desconto || 0,
    situacao: data.situacao || 'ABERTA',
    forma_pagamento: data.forma_pagamento,
    observacoes: data.observacoes,
    source_system: payload.source_system,
    sync_metadata: {
      external_id: data.id,
      synchronized_at: new Date().toISOString(),
      source_data: data
    }
  };
  
  switch (event) {
    case 'insert':
    case 'sync':
      return await supabase
        .from('contas_receber')
        .insert(financeiroData)
        .select()
        .single();
        
    case 'update':
      return await supabase
        .from('contas_receber')
        .update({
          ...financeiroData,
          updated_at: new Date().toISOString()
        })
        .eq('numero_documento', data.numero_documento || data.id)
        .select()
        .single();
  }
}

function mapClienteData(data: any, sourceSystem: string) {
  return {
    nome: data.nome || data.razao_social,
    apelido: data.apelido || data.nome_fantasia,
    tipo: data.tipo || (data.cpf ? 'F' : 'J'),
    cpf_cnpj: data.cpf_cnpj || data.cpf || data.cnpj,
    email: data.email,
    telefone: data.telefone,
    rg: data.rg,
    data_nascimento: data.data_nascimento,
    endereco: data.endereco || {},
    emails: data.emails || (data.email ? [data.email] : []),
    telefones: data.telefones || (data.telefone ? [data.telefone] : []),
    contatos: data.contatos || [],
    documentos: data.documentos || [],
    dados_pessoais: data.dados_pessoais || {},
    qualificacao_fiscal: data.qualificacao_fiscal || {},
    nome_fantasia: data.nome_fantasia,
    cnae: data.cnae,
    site: data.site,
    forma_atuacao: data.forma_atuacao,
    data_fundacao: data.data_fundacao,
    atividade_principal: data.atividade_principal,
    contato_empresa: data.contato_empresa,
    source_system: sourceSystem,
    external_id: data.id,
    sync_metadata: {
      synchronized_at: new Date().toISOString(),
      source_data: data
    },
    ativo: data.ativo !== false
  };
}