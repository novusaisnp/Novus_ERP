import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Payload gravado por sync-webhook em sync_logs.payload_entrada — mesma forma do
// WebhookPayload original recebido do satélite (ver supabase/functions/sync-webhook/index.ts).
interface SyncPayload {
  event: 'insert' | 'update' | 'delete' | 'sync';
  table: string;
  data: Record<string, unknown>;
  old_data?: Record<string, unknown>;
  timestamp: string;
  source_system: string;
}

// Schema real de sync_logs (confirmado via `supabase gen types typescript --linked`) —
// NÃO tem table_name/operation_type/retry_count/data_payload/error_message/execution_time_ms.
interface SyncLog {
  id: string;
  empresa_representada_id: string | null;
  tipo: string;
  status: string;
  tentativas: number;
  max_tentativas: number | null;
  mensagem_erro: string | null;
  payload_entrada: SyncPayload | null;
  created_at: string;
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
    const { data: failedSyncs, error: fetchError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('status', 'ERRO')
      .lt('tentativas', 3) // Máximo 3 tentativas
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
      .order('created_at', { ascending: true })
      .limit(50); // Processar no máximo 50 por vez

    if (fetchError) {
      throw new Error(`Falha ao buscar sync_logs: ${fetchError.message}`);
    }

    console.log(`Encontradas ${failedSyncs?.length || 0} sincronizações para retry`);

    if (!failedSyncs || failedSyncs.length === 0) {
      return new Response(JSON.stringify({
        processed: 0,
        message: 'Nenhuma sincronização falhada encontrada para reprocessamento'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ id: string; status: string; table?: string; operation?: string; attempt: number; error?: string }> = [];

    for (const sync of failedSyncs as SyncLog[]) {
      try {
        console.log(`Reprocessando sync ${sync.id} - Tentativa ${sync.tentativas + 1}`);

        // Reprocessar a sincronização (escopado à empresa dona do log — nunca global)
        await reprocessSync(supabase, sync);

        // Atualizar status para sucesso
        await supabase
          .from('sync_logs')
          .update({
            status: 'SUCESSO',
            processado_em: new Date().toISOString(),
            tentativas: sync.tentativas + 1,
            mensagem_erro: null,
          })
          .eq('id', sync.id);

        results.push({
          id: sync.id,
          status: 'success',
          table: sync.payload_entrada?.table,
          operation: sync.payload_entrada?.event,
          attempt: sync.tentativas + 1
        });

        console.log(`Sync ${sync.id} reprocessado com sucesso`);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao reprocessar sync ${sync.id}:`, message);

        // Incrementar contador de retry
        await supabase
          .from('sync_logs')
          .update({
            tentativas: sync.tentativas + 1,
            mensagem_erro: message,
          })
          .eq('id', sync.id);

        results.push({
          id: sync.id,
          status: 'error',
          error: message,
          table: sync.payload_entrada?.table,
          operation: sync.payload_entrada?.event,
          attempt: sync.tentativas + 1
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erro no retry de sincronizações:', message);

    return new Response(JSON.stringify({
      error: message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function reprocessSync(supabase: SupabaseClient, syncLog: SyncLog) {
  const payload = syncLog.payload_entrada;

  if (!payload) {
    throw new Error('Payload não encontrado no log de sincronização (payload_entrada vazio)');
  }

  // empresa_representada_id é gravado pelo sync-webhook a partir do header x-empresa-id
  // já validado por assinatura — é a única fonte confiável de tenant aqui, nunca payload.data.
  const empresaId = syncLog.empresa_representada_id;
  if (!empresaId) {
    throw new Error('sync_log sem empresa_representada_id — não é seguro reprocessar sem tenant conhecido');
  }

  console.log(`Reprocessando sync ${syncLog.id} da tabela ${payload.table}`);

  switch (payload.table.toLowerCase()) {
    case 'clientes':
      return await reprocessCliente(supabase, payload, empresaId);
    case 'vendas':
      return await reprocessVenda(supabase, payload, empresaId);
    case 'contratos':
      return await reprocessContrato(supabase, payload, empresaId);
    case 'contas_receber':
    case 'financeiro':
      return await reprocessFinanceiro(supabase, payload, empresaId);
    default:
      throw new Error(`Tabela não suportada para reprocessamento: ${payload.table}`);
  }
}

async function reprocessCliente(supabase: SupabaseClient, payload: SyncPayload, empresaId: string) {
  const { data } = payload;

  switch (payload.event) {
    case 'insert':
    case 'sync': {
      // Verificar se cliente já existe (escopado à empresa)
      const cpfRetry = (data.cpf as string) || (data.cpf_cnpj as string) || undefined;
      const cnpjRetry = (data.cnpj as string) || undefined;
      const { data: existingCliente } = await supabase
        .from('entidades')
        .select('id')
        .eq('empresa_representada_id', empresaId)
        .or(`externo_id.eq.${data.id},cpf.eq.${cpfRetry},cnpj.eq.${cnpjRetry}`)
        .maybeSingle();

      if (existingCliente) {
        // Se já existe, fazer update
        const result = await supabase
          .from('entidades')
          .update({
            ...mapClienteData(data, payload.source_system, empresaId),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCliente.id)
          .eq('empresa_representada_id', empresaId)
          .select()
          .single();
        await ensurePapelCliente(supabase, existingCliente.id, empresaId);
        return result;
      }

      // Se não existe, inserir
      const inserted = await supabase
        .from('entidades')
        .insert(mapClienteData(data, payload.source_system, empresaId))
        .select()
        .single();
      if (inserted.data?.id) await ensurePapelCliente(supabase, inserted.data.id, empresaId);
      return inserted;
    }

    case 'update':
      return await supabase
        .from('entidades')
        .update({
          ...mapClienteData(data, payload.source_system, empresaId),
          updated_at: new Date().toISOString()
        })
        .eq('externo_id', data.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .single();

    case 'delete':
      return await supabase
        .from('entidades')
        .update({
          ativo: false,
          updated_at: new Date().toISOString()
        })
        .eq('externo_id', data.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .single();
  }
}

async function ensurePapelCliente(supabase: SupabaseClient, entidadeId: string, empresaId: string) {
  await supabase
    .from('entidade_papeis')
    .upsert(
      { entidade_id: entidadeId, empresa_representada_id: empresaId, papel: 'CLIENTE' },
      { onConflict: 'entidade_id,papel', ignoreDuplicates: true },
    );
}

async function reprocessVenda(supabase: SupabaseClient, payload: SyncPayload, empresaId: string) {
  const { data } = payload;

  // Buscar cliente (escopado à empresa)
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(`externo_id.eq.${data.cliente_id},cpf.eq.${data.cliente_cpf_cnpj},cnpj.eq.${data.cliente_cpf_cnpj}`)
      .maybeSingle();

    clienteId = cliente?.id;
  }

  const vendaData = {
    empresa_representada_id: empresaId,
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

  if (payload.event === 'insert' || payload.event === 'sync') {
    // Verificar se venda já existe (escopado à empresa)
    const { data: existingVenda } = await supabase
      .from('vendas')
      .select('id')
      .eq('numero_venda', data.numero_venda || data.id)
      .eq('empresa_representada_id', empresaId)
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
        .eq('empresa_representada_id', empresaId)
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
    .eq('empresa_representada_id', empresaId)
    .select()
    .single();
}

async function reprocessContrato(supabase: SupabaseClient, payload: SyncPayload, empresaId: string) {
  const { data } = payload;

  // Buscar cliente (escopado à empresa)
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(`externo_id.eq.${data.cliente_id},cpf.eq.${data.cliente_cpf_cnpj},cnpj.eq.${data.cliente_cpf_cnpj}`)
      .maybeSingle();

    clienteId = cliente?.id;
  }

  const contratoData = {
    empresa_representada_id: empresaId,
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

  if (payload.event === 'insert' || payload.event === 'sync') {
    // Verificar se contrato já existe (escopado à empresa)
    const { data: existingContrato } = await supabase
      .from('contratos')
      .select('id')
      .eq('numero_contrato', data.numero_contrato || data.id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();

    if (existingContrato) {
      return await supabase
        .from('contratos')
        .update({
          ...contratoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContrato.id)
        .eq('empresa_representada_id', empresaId)
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
    .eq('empresa_representada_id', empresaId)
    .select()
    .single();
}

async function reprocessFinanceiro(supabase: SupabaseClient, payload: SyncPayload, empresaId: string) {
  const { data } = payload;

  // Buscar relacionamentos (todos escopados à empresa)
  let clienteId = null, vendaId = null, contratoId = null;

  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(`externo_id.eq.${data.cliente_id},cpf.eq.${data.cliente_cpf_cnpj},cnpj.eq.${data.cliente_cpf_cnpj}`)
      .maybeSingle();
    clienteId = cliente?.id;
  }

  if (data.venda_id) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('id')
      .eq('numero_venda', data.venda_id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();
    vendaId = venda?.id;
  }

  if (data.contrato_id) {
    const { data: contrato } = await supabase
      .from('contratos')
      .select('id')
      .eq('numero_contrato', data.contrato_id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();
    contratoId = contrato?.id;
  }

  const financeiroData = {
    empresa_representada_id: empresaId,
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

  if (payload.event === 'insert' || payload.event === 'sync') {
    // Verificar se conta já existe (escopado à empresa)
    const { data: existingConta } = await supabase
      .from('contas_receber')
      .select('id')
      .eq('numero_documento', data.numero_documento || data.id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();

    if (existingConta) {
      return await supabase
        .from('contas_receber')
        .update({
          ...financeiroData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConta.id)
        .eq('empresa_representada_id', empresaId)
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
    .eq('empresa_representada_id', empresaId)
    .select()
    .single();
}

// Mesmo mapeamento de supabase/functions/sync-webhook/index.ts (não
// compartilhado entre as duas functions, mas precisa ficar em sincronia —
// esta é a versão usada só no caminho de retry). `entidades` é a forma
// canônica única (tipo_pessoa/cpf/cnpj, endereço flat) — sem os campos que
// nunca existiram de verdade em `clientes` (source_system/external_id/
// sync_metadata como colunas soltas, emails[]/telefones[] array).
function mapClienteData(data: Record<string, unknown>, sourceSystem: string, empresaId: string) {
  const cpf = (data.cpf as string) || null;
  const cnpj = (data.cnpj as string) || null;
  const tipoPessoa = (data.tipo_pessoa as string) || (cpf ? 'PF' : cnpj ? 'PJ' : null);
  const enderecoObj = (data.endereco && typeof data.endereco === 'object') ? (data.endereco as Record<string, unknown>) : {};

  return {
    empresa_representada_id: empresaId,
    nome: data.nome || data.razao_social,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    apelido: data.apelido,
    tipo_pessoa: tipoPessoa,
    cpf,
    cnpj,
    email: data.email,
    telefone: data.telefone,
    rg: data.rg,
    data_nascimento: data.data_nascimento,
    cep: data.cep ?? enderecoObj.cep,
    logradouro: data.logradouro ?? enderecoObj.logradouro,
    numero: data.numero ?? enderecoObj.numero,
    complemento: data.complemento ?? enderecoObj.complemento,
    bairro: data.bairro ?? enderecoObj.bairro,
    cidade: data.cidade ?? enderecoObj.cidade,
    estado: data.uf ?? data.estado ?? enderecoObj.uf,
    contatos: data.contatos || [],
    documentos: data.documentos || [],
    dados_pessoais: data.dados_pessoais || {},
    qualificacao_fiscal: data.qualificacao_fiscal || {},
    cnae: data.cnae,
    site: data.site,
    forma_atuacao: data.forma_atuacao,
    data_fundacao: data.data_fundacao,
    atividade_principal: data.atividade_principal,
    contato_empresa: data.contato_empresa,
    origem_sistema: sourceSystem,
    origem_canal: 'webhook',
    externo_id: data.id,
    ativo: data.ativo !== false
  };
}
