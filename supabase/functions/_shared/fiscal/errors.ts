// Padrão único de erro/log estruturado para edge functions fiscais (Fase 4).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

export type FiscalErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'METHOD_NOT_ALLOWED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'DEADLINE_EXCEEDED'
  | 'DUPLICATE'
  | 'DB_ERROR'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

const STATUS: Record<FiscalErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  METHOD_NOT_ALLOWED: 405,
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  DEADLINE_EXCEEDED: 408,
  DUPLICATE: 409,
  DB_ERROR: 500,
  PROVIDER_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export interface FiscalErrorBody {
  error: { code: FiscalErrorCode; message: string; details?: unknown };
}

export const errorResponse = (
  code: FiscalErrorCode,
  message: string,
  details?: unknown,
): Response => {
  const body: FiscalErrorBody = { error: { code, message, ...(details !== undefined ? { details } : {}) } };
  return new Response(JSON.stringify(body), {
    status: STATUS[code],
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

export const okResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export interface FiscalLog {
  fn: string;
  event: string;
  latency_ms?: number;
  user_id?: string | null;
  documento_id?: string | null;
  code?: FiscalErrorCode;
  mock?: boolean;
  [k: string]: unknown;
}

export const logJson = (entry: FiscalLog): void => {
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
  } catch {
    console.log('[fiscal] failed to serialize log', entry.fn, entry.event);
  }
};
