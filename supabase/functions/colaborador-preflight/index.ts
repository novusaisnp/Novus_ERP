import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflightResponseSchema, type PreflightResponse } from '../_shared/canonical/preflight.ts'

// Porta 3 — checagem síncrona "pessoa já é Colaborador validado?" (CONTRATOS_CANONICOS_ERP.md
// §6/§7). Genérico por design: identifica só por cpf + empresa_representada_id, nunca por
// role/função no satélite chamador -- qualquer satélite futuro (PDV, frente de caixa, CRM)
// reusa este mesmo endpoint sem alteração.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-source-system, x-empresa-id',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacSha256Hex(rawBody: Uint8Array, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, rawBody)
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bloqueio(codigo: string, motivo: string): PreflightResponse {
  return { autorizado: false, bloqueios: [{ codigo, motivo, pode_ser_superado: false }] }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Mesmo esquema V1 (HMAC-SHA256 sobre o corpo cru) e mesmos headers de
    // sync-webhook -- reusa a mesma linha de webhook_configs por
    // source_system + empresa_representada_id, sem tabela/secret duplicado.
    const signature = req.headers.get('x-webhook-signature')
    const sourceSystem = req.headers.get('x-source-system')
    const empresaId = req.headers.get('x-empresa-id')

    if (!signature || !sourceSystem || !empresaId) {
      return jsonResponse(
        { error: 'x-source-system, x-empresa-id e x-webhook-signature são obrigatórios' },
        400
      )
    }

    const rawBody = new Uint8Array(await req.arrayBuffer())
    if (rawBody.byteLength === 0) {
      return jsonResponse({ error: 'empty_body' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: config, error: cfgError } = await supabase
      .from('webhook_configs')
      .select('secret_token')
      .eq('nome', sourceSystem)
      .eq('empresa_representada_id', empresaId)
      .eq('ativo', true)
      .maybeSingle()

    if (cfgError || !config?.secret_token) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const expected = await hmacSha256Hex(rawBody, config.secret_token)
    const provided = signature.replace(/^sha256=/i, '')
    if (!timingSafeEqual(expected, provided)) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const body = JSON.parse(new TextDecoder().decode(rawBody))
    const cpf = typeof body.cpf === 'string' ? body.cpf.replace(/\D/g, '') : ''
    if (cpf.length !== 11) {
      return jsonResponse({ error: 'cpf inválido' }, 400)
    }

    const { data: colaborador, error: colError } = await supabase
      .from('entidades')
      .select('id, ativo, deleted_at, entidade_papeis!inner(papel), entidade_dados_colaborador(data_demissao)')
      .eq('empresa_representada_id', empresaId)
      .eq('cpf', cpf)
      .eq('entidade_papeis.papel', 'COLABORADOR')
      .maybeSingle()

    if (colError) {
      console.error('Failed to query colaborador:', colError)
      return jsonResponse({ error: 'internal_error' }, 500)
    }

    if (!colaborador) {
      return jsonResponse(bloqueio('COLABORADOR_NAO_ENCONTRADO', 'CPF não corresponde a nenhum colaborador cadastrado nesta empresa'), 200)
    }
    if (colaborador.deleted_at || !colaborador.ativo) {
      return jsonResponse(bloqueio('COLABORADOR_INATIVO', 'Colaborador encontrado, mas está inativo ou foi removido'), 200)
    }
    const dadosColaborador = Array.isArray(colaborador.entidade_dados_colaborador)
      ? colaborador.entidade_dados_colaborador[0]
      : colaborador.entidade_dados_colaborador
    if (dadosColaborador?.data_demissao && new Date(dadosColaborador.data_demissao) <= new Date()) {
      return jsonResponse(bloqueio('COLABORADOR_DEMITIDO', 'Colaborador encontrado, mas já foi desligado'), 200)
    }

    const authorized: PreflightResponse = { autorizado: true, bloqueios: [] }
    return jsonResponse(preflightResponseSchema.parse(authorized), 200)
  } catch (error) {
    console.error('Unexpected error in colaborador-preflight:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
