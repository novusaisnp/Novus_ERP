import type { ContaReceber, ContaReceberInput, ContaReceberStatus } from '@/types/contasReceber';

// Linha crua vinda do Supabase (com embeds opcionais de cliente/rateios) — nomes de
// coluna reais, tipos permissivos porque nem todo select traz todos os campos.
interface ContaReceberRow {
  [key: string]: unknown;
  id: string;
  empresa_representada_id?: string;
  numero_documento?: string | null;
  descricao?: string;
  cliente_id?: string | null;
  valor_original: number | string;
  valor_recebido?: number | string | null;
  valor_desconto?: number | string | null;
  valor_juros?: number | string | null;
  valor_multa?: number | string | null;
  data_emissao?: string | null;
  data_vencimento: string;
  data_recebimento?: string | null;
  status?: string;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  natureza_id?: string | null;
  plano_pagamento_id?: string | null;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
  observacoes?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  venda_id?: string | null;
  venda_pagamento_id?: string | null;
  venda_pagamento_parcela_id?: string | null;
  origem_canal?: string | null;
  origem_sistema?: string | null;
  externo_id?: string | null;
  idempotency_key?: string | null;
  hash_payload?: string | null;
  created_by?: string | null;
  cliente?: { id: string; nome: string; cnpj?: string | null; cpf?: string | null } | null;
  rateios?: unknown;
}

const STATUS_VALIDO: ContaReceberStatus[] = ['PENDENTE', 'RECEBIDO', 'PARCIAL', 'VENCIDO', 'CANCELADO'];

// Aceita valores legados vindos da UI ("ABERTA", "RECEBIDA", etc.)
const LEGACY_STATUS_MAP: Record<string, ContaReceberStatus> = {
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
};

export const normalizarStatus = (raw: unknown): ContaReceberStatus => {
  if (typeof raw !== 'string') return 'PENDENTE';
  const up = raw.toUpperCase().trim();
  return (LEGACY_STATUS_MAP[up] || (STATUS_VALIDO.includes(up as ContaReceberStatus) ? (up as ContaReceberStatus) : 'PENDENTE'));
};

export const transformFromSupabase = (data: ContaReceberRow): ContaReceber => {
  const status = normalizarStatus(data.status);
  const valorRecebido = data.valor_recebido != null ? Number(data.valor_recebido) : null;
  return {
    id: data.id,
    empresa_representada_id: data.empresa_representada_id,
    numero_documento: data.numero_documento ?? null,
    descricao: data.descricao,
    cliente_id: data.cliente_id ?? null,
    valor_original: Number(data.valor_original),
    valor_recebido: valorRecebido,
    valor_desconto: data.valor_desconto != null ? Number(data.valor_desconto) : null,
    valor_juros: data.valor_juros != null ? Number(data.valor_juros) : null,
    valor_multa: data.valor_multa != null ? Number(data.valor_multa) : null,
    data_emissao: data.data_emissao ?? null,
    data_vencimento: data.data_vencimento,
    data_recebimento: data.data_recebimento ?? null,
    status,
    plano_conta_id: data.plano_conta_id ?? null,
    centro_custo_id: data.centro_custo_id ?? null,
    natureza_id: data.natureza_id ?? null,
    plano_pagamento_id: data.plano_pagamento_id ?? null,
    numero_parcela: data.numero_parcela ?? null,
    total_parcelas: data.total_parcelas ?? null,
    observacoes: data.observacoes ?? null,
    deleted_at: data.deleted_at ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,

    // FIN-E5: rastreabilidade
    venda_id: data.venda_id ?? null,
    venda_pagamento_id: data.venda_pagamento_id ?? null,
    venda_pagamento_parcela_id: data.venda_pagamento_parcela_id ?? null,
    origem_canal: data.origem_canal ?? null,
    origem_sistema: data.origem_sistema ?? null,
    externo_id: data.externo_id ?? null,
    idempotency_key: data.idempotency_key ?? null,
    hash_payload: data.hash_payload ?? null,
    created_by: data.created_by ?? null,

    // aliases
    situacao: status,
    valor_pago: valorRecebido,
    data_pagamento: data.data_recebimento ?? null,
    forma_pagamento: null,

    cliente: data.cliente
      ? {
          id: data.cliente.id,
          nome: data.cliente.nome,
          cpf_cnpj: data.cliente.cnpj ?? data.cliente.cpf ?? null,
        }
      : null,

    rateios: Array.isArray(data.rateios)
      ? (data.rateios as Array<Record<string, unknown>>).map((r) => ({
          id: r.id,
          plano_conta_id: r.plano_conta_id ?? null,
          centro_custo_id: r.centro_custo_id ?? null,
          valor: Number(r.valor) || 0,
          percentual: Number(r.percentual) || 0,
          observacoes: r.observacoes ?? null,
          plano_conta: r.plano_conta ?? undefined,
          centro_custo: r.centro_custo ?? undefined,
        })) as unknown as ContaReceber['rateios']
      : [],
  };
};

export const transformToSupabase = (input: ContaReceberInput) => {
  // Aceita tanto o schema novo quanto os campos legados enviados por telas antigas
  // (situacao/valor_pago/data_pagamento não fazem parte de ContaReceberInput).
  const legacy = input as ContaReceberInput & { situacao?: string; valor_pago?: number; data_pagamento?: string };
  const status = normalizarStatus(input.status ?? legacy.situacao);
  const valorRecebido =
    input.valor_recebido != null
      ? Number(input.valor_recebido)
      : legacy.valor_pago != null
      ? Number(legacy.valor_pago)
      : null;
  const dataRecebimento = input.data_recebimento ?? legacy.data_pagamento ?? null;

  const rawPeriod = (input.periodicidade ?? null) as string | null;
  const periodicidade = rawPeriod && rawPeriod !== 'UNICA' ? rawPeriod : null;

  return {
    empresa_representada_id: input.empresa_representada_id,
    descricao: input.descricao,
    numero_documento: input.numero_documento || null,
    cliente_id: input.cliente_id || null,
    valor_original: Number(input.valor_original),
    valor_recebido: valorRecebido,
    valor_desconto: input.valor_desconto != null ? Number(input.valor_desconto) : null,
    data_emissao: input.data_emissao || null,
    data_vencimento: input.data_vencimento,
    data_competencia: input.data_competencia || null,
    data_recebimento: dataRecebimento,
    status,
    plano_conta_id: input.plano_conta_id || null,
    centro_custo_id: input.centro_custo_id || null,
    natureza_id: input.natureza_id || null,
    numero_parcela: input.numero_parcela ?? null,
    total_parcelas: input.total_parcelas ?? null,
    recorrente: Boolean(input.recorrente),
    periodicidade,
    observacoes: input.observacoes || null,
  };
};
