import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

/**
 * Autorização de operação financeira sensível.
 *
 * Baixa retroativa além de 24h, estorno e cancelamento exigem que um usuário permissionado
 * se identifique. A senha vai para a edge function `financeiro-autorizar`, nunca para o
 * Postgres — como parâmetro de RPC ela apareceria em `pg_stat_statements` e nos logs de
 * query. De volta vem um ticket de uso único e vida curta, que as RPCs consomem.
 */

export type AcaoAutorizavel = 'LIQUIDACAO_RETROATIVA' | 'ESTORNO' | 'CANCELAMENTO';

/** Código SQLSTATE que o banco usa para dizer "falta autorização". */
const SQLSTATE_AUTORIZACAO = '28000';

export class AutorizacaoRequeridaError extends Error {
  constructor(readonly acao: AcaoAutorizavel, mensagem?: string) {
    super(mensagem || 'Esta operação exige autorização de um usuário permissionado.');
    this.name = 'AutorizacaoRequeridaError';
  }
}

/** Reconhece a recusa por falta de autorização vinda do banco. */
export function exigeAutorizacao(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    (erro as { code?: string }).code === SQLSTATE_AUTORIZACAO
  );
}

export interface PedidoAutorizacao {
  acao: AcaoAutorizavel;
  email: string;
  senha: string;
  justificativa: string;
  contexto?: Record<string, unknown>;
}

export async function solicitarAutorizacao(pedido: PedidoAutorizacao): Promise<string> {
  // A autorização vale para a empresa em que se está operando, e quem opera acima de uma
  // empresa não tem vínculo fixo em `usuarios` — daí mandar a empresa ativa explicitamente.
  const empresaId = await getEmpresaIdAtual();

  const { data, error } = await supabase.functions.invoke('financeiro-autorizar', {
    body: { ...pedido, empresa_representada_id: empresaId },
  });

  const corpo = data as { ok?: boolean; ticket?: string; message?: string } | null;
  if (corpo?.ok && corpo.ticket) return corpo.ticket;

  // Em resposta não-2xx o cliente devolve apenas "non-2xx status code", que não diz nada ao
  // usuário — a mensagem útil ("Credenciais inválidas", "sem permissão") está no corpo, que
  // vem anexado ao erro. Ler de lá antes de cair na mensagem genérica.
  const resposta = (error as { context?: Response } | null)?.context;
  if (resposta && typeof resposta.json === 'function') {
    const detalhe = await resposta.json().catch(() => null);
    if (detalhe?.message) throw new Error(detalhe.message);
  }

  if (corpo?.message) throw new Error(corpo.message);
  throw new Error(error?.message || 'Falha ao autorizar operação.');
}
