
import type { ContaPagar, RateioContaPagar, SupabaseContaPagar } from '@/types/contasPagar';
import { dbStatusPagarToUi, uiStatusPagarToDb } from '@/lib/statusMappers';

// Linha crua vinda do Supabase (com embeds opcionais de fornecedor/plano_conta/
// centro_custo/rateios) — tipos permissivos porque nem todo select traz tudo.
type ContaPagarRow = Record<string, unknown>;

interface RateioContaPagarRow {
  id: unknown;
  plano_conta_id: unknown;
  centro_custo_id: unknown;
  valor: unknown;
  percentual: unknown;
  descricao: unknown;
  plano_contas?: { id: unknown; codigo: unknown; nome: unknown; tipo: unknown } | null;
  centros_custo?: { id: unknown; nome: unknown; codigo: unknown } | null;
}

export const transformFromSupabase = (item: ContaPagarRow): ContaPagar => {

  // Transformar rateios se existirem
  let rateios: RateioContaPagar[] = [];

  if (item.rateios_contas_pagar && Array.isArray(item.rateios_contas_pagar)) {
    rateios = (item.rateios_contas_pagar as RateioContaPagarRow[]).map((rateio) => ({
      id: rateio.id,
      plano_conta_id: rateio.plano_conta_id,
      centro_custo_id: rateio.centro_custo_id,
      valor: parseFloat(String(rateio.valor)) || 0,
      percentual: parseFloat(String(rateio.percentual)) || 0,
      descricao: rateio.descricao ?? null,
      plano_conta: rateio.plano_contas ? {
        id: rateio.plano_contas.id,
        codigo: rateio.plano_contas.codigo,
        nome: rateio.plano_contas.nome,
        tipo: rateio.plano_contas.tipo,
      } : undefined,
      centro_custo: rateio.centros_custo ? {
        id: rateio.centros_custo.id,
        nome: rateio.centros_custo.nome,
        codigo: rateio.centros_custo.codigo,
      } : undefined,
    })) as unknown as RateioContaPagar[];
  }


  const fornecedorRow = item.fornecedores as Record<string, unknown> | null | undefined;
  const planoContaRow = item.plano_contas as Record<string, unknown> | null | undefined;
  const centroCustoRow = item.centros_custo as Record<string, unknown> | null | undefined;

  const valorOriginal = parseFloat(String(item.valor_original)) || 0;
  const valorPago = parseFloat(String(item.valor_pago)) || 0;
  const valorAtual = item.valor_atual != null
    ? parseFloat(String(item.valor_atual)) || 0
    : Math.max(valorOriginal - valorPago, 0);

  return {
    id: item.id,
    empresa_representada_id: item.empresa_representada_id ?? null,
    numero_documento: item.numero_documento,
    descricao: item.descricao,
    fornecedor_id: item.fornecedor_id,
    plano_conta_id: item.plano_conta_id,
    centro_custo_id: item.centro_custo_id,
    valor_original: valorOriginal,
    valor_atual: valorAtual,
    data_vencimento: item.data_vencimento,
    data_emissao: item.data_emissao,
    data_competencia: item.data_competencia,
    situacao: dbStatusPagarToUi(item.status ?? item.situacao) as 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA',
    observacoes: item.observacoes,
    anexos: Array.isArray(item.anexos) ? item.anexos : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    periodicidade: item.periodicidade as 'UNICA' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | undefined,
    recorrente: Boolean(item.recorrente),
    conta_origem_id: item.conta_origem_id,
    numero_parcela: item.numero_parcela,
    total_parcelas: item.total_parcelas,
    ativo: item.deleted_at == null,
    created_at: item.created_at,
    updated_at: item.updated_at,

    rateios: rateios,
    // Relacionamentos
    fornecedor: fornecedorRow ? {
      id: fornecedorRow.id,
      razao_social: fornecedorRow.razao_social,
      nome_fantasia: fornecedorRow.nome_fantasia,
    } : undefined,
    plano_conta: planoContaRow ? {
      id: planoContaRow.id,
      codigo: planoContaRow.codigo,
      nome: planoContaRow.nome,
      tipo: planoContaRow.tipo,
    } : undefined,
    centro_custo: centroCustoRow ? {
      id: centroCustoRow.id,
      nome: centroCustoRow.nome,
      codigo: centroCustoRow.codigo,
    } : undefined,
  } as unknown as ContaPagar;
};

export const transformToSupabase = (input: Record<string, unknown>): SupabaseContaPagar => {
  
  return {
    id: input.id,
    empresa_representada_id: input.empresa_representada_id ?? null,
    numero_documento: input.numero_documento,
    descricao: input.descricao,
    fornecedor_id: input.fornecedor_id || null,
    plano_conta_id: input.plano_conta_id || null,
    centro_custo_id: input.centro_custo_id || null,
    valor_original: input.valor_original,
    valor_atual: input.valor_atual,
    data_vencimento: input.data_vencimento,
    data_emissao: input.data_emissao,
    data_competencia: input.data_competencia || null,
    situacao: input.situacao,
    observacoes: input.observacoes || null,
    anexos: input.anexos || [],
    tags: input.tags || [],
    periodicidade: input.periodicidade || null,
    recorrente: input.recorrente || false,
    conta_origem_id: input.conta_origem_id || null,
    numero_parcela: input.numero_parcela || null,
    total_parcelas: input.total_parcelas || null,
    ativo: input.ativo !== false,
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as SupabaseContaPagar;
};
