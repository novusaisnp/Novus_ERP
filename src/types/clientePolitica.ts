// FIN-E2: política de pagamento/crédito por cliente
export type ClientePoliticaStatus = 'ATIVO' | 'BLOQUEADO' | 'EM_ANALISE';

export interface ClientePoliticaPagamento {
  id: string;
  empresa_representada_id: string;
  cliente_id: string;
  permite_crediario: boolean;
  limite_crediario: number;
  limite_utilizado: number;
  dias_max_atraso: number | null;
  status: ClientePoliticaStatus;
  motivo_bloqueio: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ClientePoliticaInput {
  empresa_representada_id: string;
  cliente_id: string;
  permite_crediario: boolean;
  limite_crediario: number;
  limite_utilizado?: number;
  dias_max_atraso: number | null;
  status: ClientePoliticaStatus;
  motivo_bloqueio: string | null;
}

export interface ClienteModalidadeBloqueada {
  id: string;
  empresa_representada_id: string;
  cliente_id: string;
  modalidade_id: string;
  motivo: string | null;
  created_by: string | null;
  created_at: string;
}

export function limiteDisponivel(p: Pick<ClientePoliticaPagamento, 'limite_crediario' | 'limite_utilizado'> | null | undefined): number {
  if (!p) return 0;
  return Math.max(0, Number(p.limite_crediario || 0) - Number(p.limite_utilizado || 0));
}
