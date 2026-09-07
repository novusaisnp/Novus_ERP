import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// COMP-1b: link público de cotação — fornecedor preenche o próprio preço sem
// login no NOVUS ERP. Sem verify_jwt (config.toml), chamável por anon.
// `convite_id` = id de cotacoes_compra_fornecedores, é o próprio "token" (uuid
// aleatório, não sequencial). A function É o gate de autorização — nunca
// expõe policy de RLS pra anon nas tabelas de cotação: toda validação
// (cotação ainda ABERTA, item pertence à requisição certa, só grava preço do
// fornecedor dono do convite) acontece aqui, com a service_role key.
//
// Camada extra contra link enviado pro fornecedor errado (pedido do usuário):
// além do token em si já ser imprevisível, a tela exige confirmar o
// CNPJ/CPF do fornecedor antes de revelar itens/preços — `documento` é
// reconferido no servidor em toda chamada (get e submit), nunca confia em
// flag do cliente dizendo "já verifiquei".

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function onlyDigits(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\D/g, '') : ''
}

interface ItemPayload {
  requisicao_item_id: string
  preco_unitario: number
  prazo_entrega_dias?: number | null
  observacao?: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => null)
    const action = body?.action
    const conviteId = body?.convite_id

    if (!conviteId || typeof conviteId !== 'string') {
      return jsonResponse({ error: 'convite_id obrigatório' }, 400)
    }
    if (action !== 'get' && action !== 'submit') {
      return jsonResponse({ error: 'action deve ser "get" ou "submit"' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: convite, error: conviteError } = await supabase
      .from('cotacoes_compra_fornecedores')
      .select(
        `id, cotacao_id, empresa_representada_id, fornecedor_id, respondido_em,
         fornecedor:entidades!cotacoes_compra_fornecedores_fornecedor_id_fkey(nome, razao_social, nome_fantasia, cnpj, cpf, tipo_pessoa),
         empresa:empresas_representadas!cotacoes_compra_fornecedores_empresa_representada_id_fkey(nome, cnpj, configuracoes),
         cotacao:cotacoes_compra!cotacoes_compra_fornecedores_cotacao_id_fkey(
           id, status, prazo_resposta,
           requisicao:requisicoes_compra!cotacoes_compra_requisicao_id_fkey(
             id, justificativa,
             itens:requisicoes_compra_itens(id, quantidade, produto:produtos(nome))
           )
         )`
      )
      .eq('id', conviteId)
      .maybeSingle()

    if (conviteError) {
      console.error('[compras-cotacao-publica] erro ao buscar convite:', conviteError)
      return jsonResponse({ error: 'Erro ao carregar cotação' }, 500)
    }
    if (!convite) {
      return jsonResponse({ error: 'Link inválido — verifique se copiou corretamente' }, 404)
    }

    const fornecedor = convite.fornecedor as unknown as {
      nome: string | null; razao_social: string | null; nome_fantasia: string | null
      cnpj: string | null; cpf: string | null; tipo_pessoa: string | null
    }
    const empresa = convite.empresa as unknown as {
      nome: string | null; cnpj: string | null; configuracoes: Record<string, unknown> | null
    }

    const nomeFornecedor = fornecedor.razao_social || fornecedor.nome_fantasia || fornecedor.nome || 'Fornecedor'
    const documentoEsperado = onlyDigits(fornecedor.tipo_pessoa === 'PF' ? fornecedor.cpf : fornecedor.cnpj)

    let logoUrl: string | null = null
    const logoPath = typeof empresa.configuracoes?.logo_path === 'string' ? (empresa.configuracoes.logo_path as string) : ''
    if (logoPath) {
      const { data: signed } = await supabase.storage.from('empresa-logos').createSignedUrl(logoPath, 3600)
      logoUrl = signed?.signedUrl ?? null
    }

    const empresaResumo = { nome: empresa.nome, cnpj: empresa.cnpj, logoUrl }
    const documentoFornecido = onlyDigits(body?.documento)
    const verificado = documentoEsperado.length > 0 && documentoFornecido === documentoEsperado

    if (!verificado) {
      return jsonResponse(
        {
          requiresVerification: true,
          fornecedorNome: nomeFornecedor,
          tipoDocumento: fornecedor.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ',
          empresa: empresaResumo,
        },
        200
      )
    }

    if (action === 'get') {
      const { data: precos } = await supabase
        .from('cotacoes_compra_precos')
        .select('requisicao_item_id, preco_unitario, prazo_entrega_dias, observacao')
        .eq('cotacao_id', convite.cotacao_id)
        .eq('fornecedor_id', convite.fornecedor_id)

      return jsonResponse({ requiresVerification: false, convite, empresa: empresaResumo, precos: precos ?? [] }, 200)
    }

    // action === 'submit'
    const cotacao = convite.cotacao as unknown as { id: string; status: string; requisicao: { itens: { id: string }[] } }
    if (cotacao.status !== 'ABERTA') {
      return jsonResponse({ error: 'Esta cotação já foi encerrada e não aceita mais respostas.' }, 409)
    }

    const itens = body?.itens as ItemPayload[] | undefined
    if (!Array.isArray(itens) || itens.length === 0) {
      return jsonResponse({ error: 'Envie o preço de ao menos um item.' }, 400)
    }

    const idsValidos = new Set(cotacao.requisicao.itens.map((i) => i.id))
    for (const item of itens) {
      if (!idsValidos.has(item.requisicao_item_id)) {
        return jsonResponse({ error: 'Item não pertence a esta cotação.' }, 400)
      }
      if (typeof item.preco_unitario !== 'number' || item.preco_unitario <= 0) {
        return jsonResponse({ error: 'Preço inválido — precisa ser maior que zero.' }, 400)
      }
    }

    const rows = itens.map((item) => ({
      cotacao_id: convite.cotacao_id,
      empresa_representada_id: convite.empresa_representada_id,
      requisicao_item_id: item.requisicao_item_id,
      fornecedor_id: convite.fornecedor_id,
      preco_unitario: item.preco_unitario,
      prazo_entrega_dias: item.prazo_entrega_dias ?? null,
      observacao: item.observacao?.trim() || null,
    }))

    const { error: upsertError } = await supabase
      .from('cotacoes_compra_precos')
      .upsert(rows, { onConflict: 'cotacao_id,requisicao_item_id,fornecedor_id' })

    if (upsertError) {
      console.error('[compras-cotacao-publica] erro ao salvar preços:', upsertError)
      return jsonResponse({ error: 'Erro ao salvar preços' }, 500)
    }

    await supabase
      .from('cotacoes_compra_fornecedores')
      .update({ respondido_em: new Date().toISOString() })
      .eq('id', conviteId)

    return jsonResponse({ ok: true }, 200)
  } catch (e) {
    console.error('[compras-cotacao-publica] erro inesperado:', e)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
