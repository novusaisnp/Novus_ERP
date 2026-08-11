import { useCallback, useRef, useState } from 'react';
import {
  AutorizacaoRequeridaError,
  type AcaoAutorizavel,
} from '@/services/autorizacaoFinanceiraService';

/**
 * Liga uma operação financeira ao diálogo de autorização.
 *
 * O fluxo é sempre o mesmo nos três modais (baixa, estorno, cancelamento): dispara a
 * operação sem ticket; se o banco recusar por falta de autorização, abre o diálogo e, com o
 * ticket em mãos, repete a mesma operação. Fica aqui para não repetir a lógica três vezes.
 *
 * Quem decide se a autorização é necessária é sempre o banco — a UI não tenta adivinhar a
 * regra das 24h, senão passariam a existir duas versões dela.
 */
export function useAutorizacaoFinanceira<TVars extends { ticket_autorizacao?: string }>(
  executar: (vars: TVars) => void,
) {
  const ultimasVars = useRef<TVars | null>(null);
  const [acao, setAcao] = useState<AcaoAutorizavel | null>(null);

  const disparar = useCallback(
    (vars: TVars) => {
      ultimasVars.current = vars;
      executar(vars);
    },
    [executar],
  );

  /** Retorna true quando o erro era falta de autorização e o diálogo assumiu o caso. */
  const tratarErro = useCallback((erro: unknown) => {
    if (erro instanceof AutorizacaoRequeridaError) {
      setAcao(erro.acao);
      return true;
    }
    return false;
  }, []);

  const fechar = useCallback(() => setAcao(null), []);

  const aoAutorizar = useCallback(
    (ticket: string) => {
      setAcao(null);
      if (!ultimasVars.current) return;
      executar({ ...ultimasVars.current, ticket_autorizacao: ticket });
    },
    [executar],
  );

  return {
    disparar,
    tratarErro,
    /** Pronto para espalhar em `<AutorizacaoFinanceiraModal />`; `acao` nula = fechado. */
    modalProps: {
      isOpen: acao !== null,
      acao: acao ?? 'CANCELAMENTO',
      contexto: (ultimasVars.current ?? {}) as Record<string, unknown>,
      onClose: fechar,
      onAutorizado: aoAutorizar,
    },
  };
}
