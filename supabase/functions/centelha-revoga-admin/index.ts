import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { dispararEmCadaSatelite, resolverAlvos } from '../_shared/centelha-fanout.ts'
import { carregarSocioAutorizado, corsHeaders, jsonResponse, listarLicencasAtivas } from '../_shared/centelha-socio.ts'

// Porta 0.2 — Revogação de acesso administrativo (push, ERP → satélites). Par simétrico da
// Porta 0.1. Desligar um sócio/representante no ERP tira o acesso dele em todos os
// satélites licenciados, sem precisar entrar em cada um.
//
// `exigirAtivo: false` de propósito: o caso normal é justamente revogar alguém que acabou
// de ser inativado no cadastro.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const contexto = await carregarSocioAutorizado(req, body?.socio_id, { exigirAtivo: false })
    if ('erro' in contexto) {
      return jsonResponse({ error: contexto.erro }, contexto.status)
    }
    const { supabase, socio, responsavelId } = contexto

    const licencas = await listarLicencasAtivas(supabase, responsavelId)
    if ('erro' in licencas) {
      return jsonResponse({ error: licencas.erro }, licencas.status)
    }

    const { alvos, falhas } = resolverAlvos(licencas.rows)
    const resultados = await dispararEmCadaSatelite(alvos, 'centelha-revoga-admin', (alvo) => ({
      tenant_ref: alvo.tenant_ref,
      email: socio.email,
    }))

    return jsonResponse({ success: true, satelites: [...falhas, ...resultados] }, 200)
  } catch (error) {
    console.error('Unexpected error in centelha-revoga-admin:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
