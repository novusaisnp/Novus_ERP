
import type { ContaPagar, RateioContaPagar, SupabaseContaPagar } from '@/types/contasPagar';
import { dbStatusPagarToUi, uiStatusPagarToDb } from '@/lib/statusMappers';


export const transformFromSupabase = (item: any): ContaPagar => {
  
  // Transformar rateios se existirem
  let rateios: RateioContaPagar[] = [];
  
  if (item.rateios_contas_pagar && Array.isArray(item.rateios_contas_pagar)) {
    rateios = item.rateios_contas_pagar.map((rateio: any) => ({
      id: rateio.id,
      plano_conta_id: rateio.plano_conta_id,
      centro_custo_id: rateio.centro_custo_id,
      valor: parseFloat(rateio.valor) || 0,
      percentual: parseFloat(rateio.percentual) || 0,
      descricao: rateio.descricao,
      plano_conta: rateio.plano_contas ? {
        id: rateio.plano_contas.id,
        codigo: rateio.plano_contas.codigo,
        nome: rateio.plano_contas.nome,
      } : undefined,
      centro_custo: rateio.centros_custo ? {
        id: rateio.centros_custo.id,
        nome: rateio.centros_custo.nome,
        codigo: rateio.centros_custo.codigo,
      } : undefined,
    }));
  }
  

  const valorOriginal = parseFloat(item.valor_original) || 0;
  const valorPago = parseFloat(item.valor_pago) || 0;
  const valorAtual = item.valor_atual != null
    ? parseFloat(item.valor_atual) || 0
    : Math.max(valorOriginal - valorPago, 0);

  return {
    id: item.id,
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
    fornecedor: item.fornecedores ? {
      id: item.fornecedores.id,
      razao_social: item.fornecedores.razao_social,
      nome_fantasia: item.fornecedores.nome_fantasia,
    } : undefined,
    plano_conta: item.plano_contas ? {
      id: item.plano_contas.id,
      codigo: item.plano_contas.codigo,
      nome: item.plano_contas.nome,
    } : undefined,
    centro_custo: item.centros_custo ? {
      id: item.centros_custo.id,
      nome: item.centros_custo.nome,
      codigo: item.centros_custo.codigo,
    } : undefined,
  };
};

export const transformToSupabase = (input: any): SupabaseContaPagar => {
  
  return {
    id: input.id,
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
  };
};
