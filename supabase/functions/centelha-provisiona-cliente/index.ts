import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Porta 0 — Provisionamento (push, NOVUS → satélite). Contrato genérico: qualquer
// satélite (educacional, pdv, clinica, mercado...) que implemente o endpoint
// `centelha-provisiona-organizacao` com este mesmo payload é provisionável sem
// mudança nenhuma aqui — o alvo vem de `centelha.satelites`, nunca hardcoded.
// Ver CONTRATOS_CANONICOS_ERP.md §"Porta 0".

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
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

interface ProvisionaBody {
  representada_id?: string
  contrato_id?: string
  satelite_codigo?: string
  organization_name?: string
  admin_nome?: string
  admin_email?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Token de autenticação requerido' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Usuário não autenticado' }, 401)
    }

    const { data: isOwner, error: ownerError } = await supabase.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'novus_owner',
    })
    if (ownerError || !isOwner) {
      return jsonResponse({ error: 'Apenas operadores NOVUS podem provisionar clientes' }, 403)
    }

    const body: ProvisionaBody = await req.json()
    const { representada_id, contrato_id, satelite_codigo, organization_name, admin_nome, admin_email } = body

    if (!representada_id || !contrato_id || !satelite_codigo || !organization_name || !admin_nome || !admin_email) {
      return jsonResponse(
        { error: 'Campos obrigatórios: representada_id, contrato_id, satelite_codigo, organization_name, admin_nome, admin_email' },
        400
      )
    }

    const { data: representada, error: representadaError } = await supabase
      .from('empresas_representadas')
      .select('id, responsavel_id')
      .eq('id', representada_id)
      .maybeSingle()
    if (representadaError || !representada) {
      return jsonResponse({ error: 'Empresa representada não encontrada' }, 404)
    }
    if (!representada.responsavel_id) {
      return jsonResponse({ error: 'Empresa representada sem responsável vinculado — não pode ser provisionada' }, 409)
    }

    const { data: responsavel, error: responsavelError } = await supabase
      .schema('centelha')
      .from('responsaveis')
      .select('id, cliente_billing_id')
      .eq('id', representada.responsavel_id)
      .maybeSingle()
    if (responsavelError || !responsavel) {
      return jsonResponse({ error: 'Responsável não encontrado' }, 404)
    }

    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('id, cliente_id')
      .eq('id', contrato_id)
      .eq('cliente_id', responsavel.cliente_billing_id)
      .maybeSingle()
    if (contratoError || !contrato) {
      return jsonResponse({ error: 'Contrato não encontrado para o cliente de cobrança deste responsável' }, 404)
    }

    const { data: satelite, error: sateliteError } = await supabase
      .schema('centelha')
      .from('satelites')
      .select('id, base_url, provisioning_secret, ativo')
      .eq('codigo', satelite_codigo)
      .maybeSingle()
    if (sateliteError || !satelite) {
      return jsonResponse({ error: `Satélite '${satelite_codigo}' não cadastrado` }, 404)
    }
    if (!satelite.ativo) {
      return jsonResponse({ error: `Satélite '${satelite_codigo}' está inativo` }, 409)
    }

    const payload = {
      organization_name,
      empresa_representada_id: representada.id,
      admin_nome,
      admin_email,
    }
    const rawBody = new TextEncoder().encode(JSON.stringify(payload))
    const signature = await hmacSha256Hex(rawBody, satelite.provisioning_secret)

    const satResponse = await fetch(`${satelite.base_url}/functions/v1/centelha-provisiona-organizacao`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': `sha256=${signature}`,
      },
      body: rawBody,
    })

    if (!satResponse.ok) {
      const errBody = await satResponse.text()
      console.error('Provisionamento no satélite falhou:', satResponse.status, errBody)
      return jsonResponse({ error: 'Falha ao provisionar organização no satélite', details: errBody }, 502)
    }

    const satResult = await satResponse.json()
    const organizationId: string | undefined = satResult.organization_id
    if (!organizationId) {
      return jsonResponse({ error: 'Satélite não retornou organization_id' }, 502)
    }

    const { data: licenca, error: licencaError } = await supabase
      .schema('centelha')
      .from('licencas')
      .insert({
        responsavel_id: responsavel.id,
        contrato_id,
        satelite_id: satelite.id,
        status: 'ativa',
        tenant_ref: organizationId,
      })
      .select('id')
      .single()

    if (licencaError) {
      console.error('Falha ao gravar licença (organização já foi criada no satélite):', licencaError)
      return jsonResponse(
        { error: 'Organização provisionada, mas falha ao gravar licença: ' + licencaError.message, organization_id: organizationId },
        500
      )
    }

    return jsonResponse({ success: true, licenca_id: licenca.id, organization_id: organizationId }, 200)
  } catch (error) {
    console.error('Unexpected error in centelha-provisiona-cliente:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
