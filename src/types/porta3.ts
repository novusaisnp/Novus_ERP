// Porta 3 (docs/PLANO_MESTRE.md §1.6): pré-checagem e autorização
// de exceção. Espelha o formato de supabase/functions/_shared/canonical/preflight.ts
// (Zod, só acessível a partir do Deno das edge functions) — duplicado aqui como
// tipo TS simples porque o dado já vem validado de uma RPC confiável, não de
// entrada externa que precise de parse/validação no cliente.
export interface Bloqueio {
  codigo: string;
  motivo: string;
  pode_ser_superado: boolean;
  permissao_necessaria?: string | null;
}

export interface PreflightResponse {
  autorizado: boolean;
  bloqueios: Bloqueio[];
}

export interface AutorizacaoExcecaoResult {
  ok: boolean;
  autorizado_id: string;
}
