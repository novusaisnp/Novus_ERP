import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SIGNED_URL_TTL_SECONDS = 3600
const LOGO_BUCKET = 'empresa-logos'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const empresaId = new URL(req.url).searchParams.get('empresa_representada_id')
    if (!empresaId) {
      return new Response(JSON.stringify({ error: 'empresa_representada_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: empresa, error } = await supabase
      .from('empresas_representadas')
      .select('configuracoes')
      .eq('id', empresaId)
      .maybeSingle()

    if (error || !empresa) {
      return new Response(JSON.stringify({ logoUrl: null }), {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    const logoPath = (empresa.configuracoes as Record<string, unknown> | null)?.logo_path as string | undefined
    if (!logoPath) {
      return new Response(JSON.stringify({ logoUrl: null }), {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    // Bucket empresa-logos é privado -- URL assinada, não pública.
    const { data: signed, error: signError } = await supabase.storage
      .from(LOGO_BUCKET)
      .createSignedUrl(logoPath, SIGNED_URL_TTL_SECONDS)

    if (signError || !signed?.signedUrl) {
      console.error('Failed to sign logo URL:', signError)
      return new Response(JSON.stringify({ logoUrl: null }), {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ logoUrl: signed.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error in get-empresa-logo:', error)
    return new Response(JSON.stringify({ logoUrl: null }), {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
