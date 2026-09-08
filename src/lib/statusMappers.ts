// Mapeamento entre valores de status usados na UI (legado) e valores reais
// aceitos pelo banco (CHECK constraints em contas_pagar / contas_receber).
// UI historicamente usa: ABERTA / PAGA / RECEBIDA / VENCIDA / CANCELADA
// DB Pagar   : PENDENTE / PAGO      / PARCIAL / VENCIDO / CANCELADO
// DB Receber : PENDENTE / RECEBIDO  / PARCIAL / VENCIDO / CANCELADO

export type UIStatusPagar = 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA' | 'PARCIAL' | 'RENEGOCIADA';
export type DBStatusPagar = 'PENDENTE' | 'PAGO' | 'PARCIAL' | 'VENCIDO' | 'CANCELADO' | 'RENEGOCIADO';
export type UIStatusReceber = 'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA' | 'PARCIAL' | 'RENEGOCIADA';
export type DBStatusReceber = 'PENDENTE' | 'RECEBIDO' | 'PARCIAL' | 'VENCIDO' | 'CANCELADO' | 'RENEGOCIADO';

const UI_TO_DB_PAGAR: Record<string, DBStatusPagar> = {
  ABERTA: 'PENDENTE',
  ABERTO: 'PENDENTE',
  PENDENTE: 'PENDENTE',
  PAGA: 'PAGO',
  PAGO: 'PAGO',
  PARCIAL: 'PARCIAL',
  VENCIDA: 'VENCIDO',
  VENCIDO: 'VENCIDO',
  CANCELADA: 'CANCELADO',
  CANCELADO: 'CANCELADO',
  RENEGOCIADA: 'RENEGOCIADO',
  RENEGOCIADO: 'RENEGOCIADO',
};

const DB_TO_UI_PAGAR: Record<string, UIStatusPagar> = {
  PENDENTE: 'ABERTA',
  PAGO: 'PAGA',
  PARCIAL: 'PARCIAL',
  VENCIDO: 'VENCIDA',
  CANCELADO: 'CANCELADA',
  RENEGOCIADO: 'RENEGOCIADA',
};

const UI_TO_DB_RECEBER: Record<string, DBStatusReceber> = {
  ABERTA: 'PENDENTE',
  ABERTO: 'PENDENTE',
  PENDENTE: 'PENDENTE',
  RECEBIDA: 'RECEBIDO',
  RECEBIDO: 'RECEBIDO',
  PARCIAL: 'PARCIAL',
  VENCIDA: 'VENCIDO',
  VENCIDO: 'VENCIDO',
  CANCELADA: 'CANCELADO',
  CANCELADO: 'CANCELADO',
  RENEGOCIADA: 'RENEGOCIADO',
  RENEGOCIADO: 'RENEGOCIADO',
};

const DB_TO_UI_RECEBER: Record<string, UIStatusReceber> = {
  PENDENTE: 'ABERTA',
  RECEBIDO: 'RECEBIDA',
  PARCIAL: 'PARCIAL',
  VENCIDO: 'VENCIDA',
  CANCELADO: 'CANCELADA',
  RENEGOCIADO: 'RENEGOCIADA',
};

export const uiStatusPagarToDb = (raw: unknown): DBStatusPagar => {
  if (typeof raw !== 'string') return 'PENDENTE';
  return UI_TO_DB_PAGAR[raw.toUpperCase().trim()] || 'PENDENTE';
};

export const dbStatusPagarToUi = (raw: unknown): UIStatusPagar => {
  if (typeof raw !== 'string') return 'ABERTA';
  return DB_TO_UI_PAGAR[raw.toUpperCase().trim()] || 'ABERTA';
};

export const uiStatusReceberToDb = (raw: unknown): DBStatusReceber => {
  if (typeof raw !== 'string') return 'PENDENTE';
  return UI_TO_DB_RECEBER[raw.toUpperCase().trim()] || 'PENDENTE';
};

export const dbStatusReceberToUi = (raw: unknown): UIStatusReceber => {
  if (typeof raw !== 'string') return 'ABERTA';
  return DB_TO_UI_RECEBER[raw.toUpperCase().trim()] || 'ABERTA';
};
