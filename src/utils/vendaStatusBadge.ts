import type { VendaStatus } from '@/types/vendas';

export const VENDA_STATUS_LABEL: Record<VendaStatus, string> = {
  RASCUNHO: 'Rascunho',
  CONFIRMADO: 'Confirmado',
  EM_PRODUCAO: 'Em produção',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

// Progressão de cor ao longo do ciclo de vida da venda: cinza (rascunho) ->
// azul (confirmado) -> âmbar (em produção, precisa de atenção) -> azul forte
// (faturado) -> verde (entregue, concluído) -> vermelho (cancelado).
export const VENDA_STATUS_BADGE_CLASS: Record<VendaStatus, string> = {
  RASCUNHO: 'text-foreground',
  CONFIRMADO: 'border-transparent bg-secondary text-secondary-foreground',
  EM_PRODUCAO: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300',
  FATURADO: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300',
  ENTREGUE: 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-300',
  CANCELADO: 'border-transparent bg-destructive text-destructive-foreground',
};
