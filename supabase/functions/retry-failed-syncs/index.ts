import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SyncLog {
  id: string;
  table_name: string;
  operation_type: 'insert' | 'update' | 'delete' | 'sync';
  retry_count: number;
  data_payload?: SyncPayload;
}

interface SyncPayload {
  source_system?: string;
  data: Record<string, unknown>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Buscar sincronizações falhadas para retry
    const { data: failedSyncs } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('status', 'error')
      .lt('retry_count', 3) // Máximo 3 tentativas
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
      .order('created_at', { ascending: true })
      .limit(50); // Processar no máximo 50 por vez

    console.log(`Encontradas ${failedSyncs?.length || 0} sincronizações para retry`);

    if (!failedSyncs || failedSyncs.length === 0) {
      return new Response(JSON.stringify({ 
        processed: 0,
        message: 'Nenhuma sincronização falhada encontrada para reprocessamento'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    
    for (const sync of failedSyncs) {
      try {
        console.log(`Reprocessando sync ${sync.id} - Tentativa ${sync.retry_count + 1}`);
        
        // Reprocessar a sincronização
        const result = await reprocessSync(supabase, sync);
        
        // Atualizar status para sucesso
        await supabase
          .from('sync_logs')
          .update({
            status: 'success',
            processed_at: new Date().toISOString(),
            retry_count: sync.retry_count + 1,
            error_message: null,
            execution_time_ms: Date.now() - startTime
          })
          .eq('id', sync.id);
          
        results.push({ 
          id: sync.id, 
          status: 'success',
          table: sync.table_name,
          operation: sync.operation_type,
          attempt: sync.retry_count + 1
        });
        
        console.log(`Sync ${sync.id} reprocessado com sucesso`);
        
      } catch (error) {
        console.error(`Erro ao reprocessar sync ${sync.id}:`, error);
        
        // Incrementar contador de retry
        await supabase
          .from('sync_logs')
          .update({
            retry_count: sync.retry_count + 1,
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', sync.id);
          
        results.push({ 
          id: sync.id, 
          status: 'error', 
          error: error.message,
          table: sync.table_name,
          operation: sync.operation_type,
          attempt: sync.retry_count + 1
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Retry concluído: ${successCount} sucessos, ${errorCount} falhas`);

    return new Response(JSON.stringify({ 
      processed: results.length,
      success: successCount,
      errors: errorCount,
      execution_time_ms: Date.now() - startTime,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no retry de sincronizações:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function reprocessSync(supabase: SupabaseClient, syncLog: SyncLog) {
  console.log(`Reprocessando sync ${syncLog.id} da tabela ${syncLog.table_name}`);
  
  const payload = syncLog.data_payload;
  
  if (!payload) {
    throw new Error('Payload não encontrado no log de sincronização');
  }

  // Reprocessar baseado no tipo de operação e tabela
  switch (syncLog.table_name.toLowerCase()) {
    case 'clientes':
      return await reprocessCliente(supabase, syncLog, payload);
    case 'vendas':
      return await reprocessVenda(supabase, syncLog, payload);
    case 'contratos':
      return await reprocessContrato(supabase, syncLog, payload);
    case 'contas_receber':
    case 'financeiro':
      return await reprocessFinanceiro(supabase, syncLog, payload);
    default:
      throw new Error(`Tabela não suportada para reprocessamento: ${syncLog.table_name}`);
  }
}

async function reprocessCliente(supabase: SupabaseClient, syncLog: SyncLog, payload: SyncPayload) {
  const { data } = payload;
  
  switch (syncLog.operation_type) {
    case 'insert':
    case 'sync': {
      // Verificar se cliente já existe
      const { data: existingCliente } = await supabase
        .from('clientes')
        .select('id')
        .or(`cpf_cnpj.eq.${data.cpf_cnpj},external_id.eq.${data.id}`)
        .maybeSingle();

      if (existingCliente) {
        // Se já existe, fazer update
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

      // Se não existe, inserir
      return await supabase
        .from('clientes')
        .insert(mapClienteData(data, payload.source_system))
        .select()
        .single();
    }

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

async function reprocessVenda(supabase: SupabaseClient, syncLog: SyncLog, payload: SyncPayload) {
  const { data } = payload;
  
  // Buscar cliente
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .maybeSingle();
    
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
  
  if (syncLog.operation_type === 'insert' || syncLog.operation_type === 'sync') {
    // Verificar se venda já existe
    const { data: existingVenda } = await supabase
      .from('vendas')
      .select('id')
      .eq('numero_venda', data.numero_venda || data.id)
      .maybeSingle();
    
    if (existingVenda) {
      // Se já existe, fazer update
      return await supabase
        .from('vendas')
        .update({
          ...vendaData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVenda.id)
        .select()
        .single();
    }
    
    // Se não existe, inserir
    return await supabase
      .from('vendas')
      .insert(vendaData)
      .select()
      .single();
  }
  
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

async function reprocessContrato(supabase: SupabaseClient, syncLog: SyncLog, payload: SyncPayload) {
  const { data } = payload;
  
  // Buscar cliente
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .maybeSingle();
    
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
  
  if (syncLog.operation_type === 'insert' || syncLog.operation_type === 'sync') {
    // Verificar se contrato já existe
    const { data: existingContrato } = await supabase
      .from('contratos')
      .select('id')
      .eq('numero_contrato', data.numero_contrato || data.id)
      .maybeSingle();
    
    if (existingContrato) {
      return await supabase
        .from('contratos')
        .update({
          ...contratoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContrato.id)
        .select()
        .single();
    }
    
    return await supabase
      .from('contratos')
      .insert(contratoData)
      .select()
      .single();
  }
  
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

async function reprocessFinanceiro(supabase: SupabaseClient, syncLog: SyncLog, payload: SyncPayload) {
  const { data } = payload;
  
  // Buscar relacionamentos
  let clienteId = null, vendaId = null, contratoId = null;
  
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .maybeSingle();
    clienteId = cliente?.id;
  }
  
  if (data.venda_id) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('id')
      .eq('numero_venda', data.venda_id)
      .maybeSingle();
    vendaId = venda?.id;
  }
  
  if (data.contrato_id) {
    const { data: contrato } = await supabase
      .from('contratos')
      .select('id')
      .eq('numero_contrato', data.contrato_id)
      .maybeSingle();
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
  
  if (syncLog.operation_type === 'insert' || syncLog.operation_type === 'sync') {
    // Verificar se conta já existe
    const { data: existingConta } = await supabase
      .from('contas_receber')
      .select('id')
      .eq('numero_documento', data.numero_documento || data.id)
      .maybeSingle();
    
    if (existingConta) {
      return await supabase
        .from('contas_receber')
        .update({
          ...financeiroData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConta.id)
        .select()
        .single();
    }
    
    return await supabase
      .from('contas_receber')
      .insert(financeiroData)
      .select()
      .single();
  }
  
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

function mapClienteData(data: Record<string, unknown>, sourceSystem: string) {
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