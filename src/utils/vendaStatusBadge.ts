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
  RASCUNHO: 'border-status-draft/30 bg-status-draft/10 text-status-draft',
  CONFIRMADO: 'border-status-confirmed/30 bg-status-confirmed/10 text-status-confirmed',
  EM_PRODUCAO: 'border-status-production/30 bg-status-production/10 text-status-production',
  FATURADO: 'border-accent-vivid/30 bg-accent-vivid/10 text-accent-vivid',
  ENTREGUE: 'border-status-delivered/30 bg-status-delivered/10 text-status-delivered',
  CANCELADO: 'border-status-cancelled/30 bg-status-cancelled/10 text-status-cancelled',
};
