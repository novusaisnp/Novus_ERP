import { supabase } from '@/integrations/supabase/client';
import type { PermissoesMovimentacao } from '@/types/movimentacoesFinanceiras';

/**
 * Capacidades financeiras do usuário atual, resolvidas no banco
 * (`financeiro_permissoes()` → `has_role` + `perfis_acesso.permissoes`).
 *
 * A UI apenas reflete essas capacidades. A autorização que vale é a das próprias
 * RPCs financeiras, que recusam a operação mesmo em chamada direta.
 */
export const NENHUMA_PERMISSAO: PermissoesMovimentacao = {
  pode_liquidar: false,
  pode_estornar: false,
  pode_editar: false,
  pode_cancelar: false,
  pode_visualizar_historico: false,
  pode_editar_rateio: false,
};

export async function fetchPermissoesFinanceiras(): Promise<PermissoesMovimentacao> {
  const { data, error } = await supabase.rpc('financeiro_permissoes');

  if (error) throw error;
  if (!data || typeof data !== 'object') {
    throw new Error('financeiro_permissoes retornou um valor inesperado');
  }

  const bruto = data as Record<string, unknown>;
  const ler = (chave: keyof PermissoesMovimentacao) => bruto[chave] === true;

  return {
    pode_liquidar: ler('pode_liquidar'),
    pode_estornar: ler('pode_estornar'),
    pode_editar: ler('pode_editar'),
    pode_cancelar: ler('pode_cancelar'),
    pode_visualizar_historico: ler('pode_visualizar_historico'),
    pode_editar_rateio: ler('pode_editar_rateio'),
  };
}
