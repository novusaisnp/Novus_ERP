/**
 * Helper de reset de DB — P16.2 (placeholder).
 * Chama a edge function `e2e-reset` (guarded por E2E_ENABLED=true).
 * Implementação completa em P16.3.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export interface DbResetOptions {
  authToken?: string;
  tenantName?: string;
}

export interface DbResetResult {
  ok: boolean;
  message?: string;
}

export async function dbReset(options: DbResetOptions = {}): Promise<DbResetResult> {
  if (!SUPABASE_URL) {
    return { ok: false, message: 'VITE_SUPABASE_URL não configurada' };
  }
  const url = `${SUPABASE_URL}/functions/v1/e2e-reset`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
  if (options.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tenantName: options.tenantName ?? 'E2E TEST CO' }),
  });
  const body = (await res.json()) as { ok?: boolean; message?: string };
  return { ok: !!body.ok, message: body.message };
}
