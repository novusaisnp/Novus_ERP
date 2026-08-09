import type { TipoMovimentacao } from '@/types/movimentacoesBancarias';

const LABELS: Record<TipoMovimentacao, string> = {
  DEPOSITO: 'Depósito',
  SAQUE: 'Saque',
  TRANSFERENCIA_SAIDA: 'Transf. Saída',
  TRANSFERENCIA_ENTRADA: 'Transf. Entrada',
  AJUSTE_POSITIVO: 'Ajuste +',
  AJUSTE_NEGATIVO: 'Ajuste -',
};

export const getTipoLabel = (tipo: string): string => LABELS[tipo as TipoMovimentacao] || tipo;
