import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { preflightResponseSchema, type PreflightResponse } from './canonical/preflight.ts'

// Porta 3 — checagem síncrona genérica "esta entidade tem este papel, ativo, nesta
// empresa?" (CONTRATOS_CANONICOS_ERP.md §6/§7). Núcleo compartilhado por
// `entidade-preflight` (endpoint novo, papel vem no payload) e `colaborador-preflight`
// (alias fino de compatibilidade, papel:'COLABORADOR' fixo). Genérico por design:
// identifica só por cpf + papel + empresa_representada_id, nunca por role/função no
// satélite chamador -- qualquer satélite futuro (PDV, frente de caixa, CRM) reusa este
// mesmo núcleo sem alteração.

export const PAPEIS_VALIDOS = [
  'CLIENTE',
  'FORNECEDOR',
  'PRESTADOR',
  'COLABORADOR',
  'SOCIO',
  'REPRESENTANTE_LEGAL',
  'PROCURADOR',
] as const

export type PapelCatalogo = (typeof PAPEIS_VALIDOS)[number]

export const corsHeaders = {
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

/**
 * @param papelFixo Quando definido (alias `colaborador-preflight`), ignora `papel` do
 *   payload e força este valor -- satélite legado continua mandando só `{ cpf }`.
 */
export async function handleEntidadePreflight(req: Request, papelFixo?: PapelCatalogo): Promise<Response> {
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

    const papel = papelFixo ?? body.papel
    if (!PAPEIS_VALIDOS.includes(papel)) {
      return jsonResponse({ error: `papel inválido ou ausente -- esperado um de: ${PAPEIS_VALIDOS.join(', ')}` }, 400)
    }

    const { data: entidade, error: entError } = await supabase
      .from('entidades')
      .select('id, ativo, deleted_at, entidade_papeis!inner(papel), entidade_dados_colaborador(data_demissao)')
      .eq('empresa_representada_id', empresaId)
      .eq('cpf', cpf)
      .eq('entidade_papeis.papel', papel)
      .maybeSingle()

    if (entError) {
      console.error('Failed to query entidade:', entError)
      return jsonResponse({ error: 'internal_error' }, 500)
    }

    if (!entidade) {
      return jsonResponse(
        bloqueio('ENTIDADE_NAO_ENCONTRADA', `CPF não corresponde a nenhuma entidade com papel ${papel} cadastrada nesta empresa`),
        200
      )
    }
    if (entidade.deleted_at || !entidade.ativo) {
      return jsonResponse(bloqueio('ENTIDADE_INATIVA', 'Entidade encontrada, mas está inativa ou foi removida'), 200)
    }

    // Checagem específica por papel, isolada do núcleo -- só COLABORADOR tem tabela de
    // extensão hoje (`entidade_dados_colaborador`); um satélite futuro pode pedir
    // checagem extra por papel sem reescrever a query central acima.
    if (papel === 'COLABORADOR') {
      const dadosColaborador = Array.isArray(entidade.entidade_dados_colaborador)
        ? entidade.entidade_dados_colaborador[0]
        : entidade.entidade_dados_colaborador
      if (dadosColaborador?.data_demissao && new Date(dadosColaborador.data_demissao) <= new Date()) {
        return jsonResponse(bloqueio('COLABORADOR_DEMITIDO', 'Colaborador encontrado, mas já foi desligado'), 200)
      }
    }

    const authorized: PreflightResponse = { autorizado: true, bloqueios: [] }
    return jsonResponse(preflightResponseSchema.parse(authorized), 200)
  } catch (error) {
    console.error('Unexpected error in entidade-preflight:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
}
