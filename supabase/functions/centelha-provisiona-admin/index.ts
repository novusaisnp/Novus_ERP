import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { dispararEmCadaSatelite, resolverAlvos } from '../_shared/centelha-fanout.ts'
import { carregarSocioAutorizado, corsHeaders, jsonResponse, listarLicencasAtivas } from '../_shared/centelha-socio.ts'

// Porta 0.1 — Provisionamento de acesso administrativo (push, ERP → satélites).
//
// Regra de negócio: sócio e representante legal recebem acesso administrativo ao ERP e a
// todo satélite licenciado sob o contrato entre a NOVUS e a empresa responsável. A
// autorização vem do contrato, não de vínculo empregatício — por isso este caminho NÃO
// passa pelo gate de colaborador (`colaborador-preflight`), que existe para staff
// contratada. Par simétrico: `centelha-revoga-admin` (Porta 0.2).

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const contexto = await carregarSocioAutorizado(req, body?.socio_id, { exigirAtivo: true })
    if ('erro' in contexto) {
      return jsonResponse({ error: contexto.erro }, contexto.status)
    }
    const { supabase, socio, responsavelId } = contexto

    const licencas = await listarLicencasAtivas(supabase, responsavelId)
    if ('erro' in licencas) {
      return jsonResponse({ error: licencas.erro }, licencas.status)
    }

    const { alvos, falhas } = resolverAlvos(licencas.rows)
    const resultados = await dispararEmCadaSatelite(alvos, 'centelha-provisiona-admin', (alvo) => ({
      tenant_ref: alvo.tenant_ref,
      nome: socio.nome,
      email: socio.email,
      cpf: socio.cpf,
      nivel: 'admin',
    }))

    return jsonResponse({ success: true, satelites: [...falhas, ...resultados] }, 200)
  } catch (error) {
    console.error('Unexpected error in centelha-provisiona-admin:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
