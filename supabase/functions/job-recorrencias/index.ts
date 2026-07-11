import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    const dias = Math.max(1, Math.min(180, Number(url.searchParams.get('dias') ?? '30')));

    const { data: mat, error: matErr } = await supabase.rpc('materializar_recorrencias', {
      p_dias_antecedencia: dias,
    });
    if (matErr) throw matErr;

    const { error: refErr } = await supabase.rpc('refresh_mv_fluxo_competencia');
    if (refErr) console.warn('[job-recorrencias] refresh MV falhou:', refErr.message);

    return new Response(
      JSON.stringify({ ok: true, resultado: mat, refresh_mv: !refErr }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[job-recorrencias] erro:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
