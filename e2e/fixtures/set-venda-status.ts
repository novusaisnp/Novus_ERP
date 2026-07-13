/**
 * Helper para transicionar status de venda em ambiente E2E.
 * Chama a edge function `e2e-set-venda-status` (guarded por E2E_ENABLED=true).
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export interface SetVendaStatusOptions {
  authToken?: string;
  vendaId: string;
  status: 'RASCUNHO' | 'CONFIRMADO' | 'EM_PRODUCAO' | 'FATURADO' | 'ENTREGUE' | 'CANCELADO';
}

export interface SetVendaStatusResult {
  ok: boolean;
  message?: string;
}

export async function setVendaStatus(opts: SetVendaStatusOptions): Promise<SetVendaStatusResult> {
  if (!SUPABASE_URL) return { ok: false, message: 'VITE_SUPABASE_URL não configurada' };
  const url = `${SUPABASE_URL}/functions/v1/e2e-set-venda-status`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
  if (opts.authToken) headers['Authorization'] = `Bearer ${opts.authToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ vendaId: opts.vendaId, status: opts.status }),
  });
  const body = (await res.json()) as { ok?: boolean; message?: string };
  return { ok: !!body.ok, message: body.message };
}
