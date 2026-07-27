// Resolve a forma de pagamento/parcelas de uma venda para exibição (VendaViewDialog) e
// impressão (vendaPdf.ts). Uma venda pode ter essa informação em dois lugares diferentes,
// dependendo de como foi criada:
// - venda_pagamento (+ venda_pagamento_parcelas): dado concreto, gravado só pelo fluxo de
//   conversão de orçamento (converter_orcamento_em_venda). Tem modalidade, parcelas com
//   valor/vencimento reais.
// - vendas.plano_pagamento_id -> planos_pagamento: gravado pelo fluxo direto de criação de
//   venda (VendaFormModal). É só a referência ao plano escolhido, sem parcelas concretas
//   geradas (nenhuma linha em venda_pagamento é criada nesse fluxo).
import type { Venda } from '@/types/vendas';
import { vendaPagamentoService } from '@/services/vendaPagamentoService';
import { pagamentoCatalogoService } from '@/services/pagamentoCatalogoService';
import { planosPagamentoService } from '@/services/configBasicasService';

export interface VendaPagamentoParcelaInfo {
  numero: number;
  valor: number;
  dataVencimento: string;
  isEntrada: boolean;
}

export interface VendaPagamentoLinhaInfo {
  modalidadeNome: string;
  naturezaNome?: string | null;
  qtdParcelas: number;
  valorLiquido: number;
  parcelas: VendaPagamentoParcelaInfo[];
}

export interface VendaPagamentoInfo {
  origem: 'pagamento' | 'plano' | 'nenhum';
  linhas: VendaPagamentoLinhaInfo[];
  planoNome?: string;
  planoNaturezaNome?: string | null;
  planoQtdParcelas?: number;
  planoDiasPrimeiraParcela?: number;
  planoIntervaloDias?: number;
}

export const resolveVendaPagamentoInfo = async (venda: Venda): Promise<VendaPagamentoInfo> => {
  if (!venda.id) return { origem: 'nenhum', linhas: [] };

  const pagamentos = await vendaPagamentoService.listByVenda(venda.id);

  if (pagamentos.length > 0) {
    const [modalidades, naturezas] = await Promise.all([
      pagamentoCatalogoService.listarModalidades(false),
      pagamentoCatalogoService.listarNaturezas(false),
    ]);
    const modalidadeById = new Map(modalidades.map((m) => [m.id, m]));
    const naturezaById = new Map(naturezas.map((n) => [n.id, n]));

    const linhas: VendaPagamentoLinhaInfo[] = await Promise.all(
      pagamentos.map(async (p) => {
        const parcelasRaw = await vendaPagamentoService.listParcelas(p.id);
        return {
          modalidadeNome: modalidadeById.get(p.modalidade_id)?.nome ?? 'Não informada',
          naturezaNome: p.natureza_id ? naturezaById.get(p.natureza_id)?.nome ?? null : null,
          qtdParcelas: p.qtd_parcelas,
          valorLiquido: Number(p.valor_liquido) || 0,
          parcelas: parcelasRaw.map((parc) => ({
            numero: parc.numero,
            valor: Number(parc.valor) || 0,
            dataVencimento: parc.data_vencimento,
            isEntrada: parc.is_entrada,
          })),
        };
      }),
    );

    return { origem: 'pagamento', linhas };
  }

  if (venda.plano_pagamento_id) {
    const planos = await planosPagamentoService.getAll();
    const plano = planos.find((p) => p.id === venda.plano_pagamento_id);
    if (plano) {
      const naturezas = await pagamentoCatalogoService.listarNaturezas(false);
      const natureza = plano.natureza_id
        ? naturezas.find((n) => n.id === plano.natureza_id)
        : undefined;
      return {
        origem: 'plano',
        linhas: [],
        planoNome: plano.nome,
        planoNaturezaNome: natureza?.nome ?? null,
        planoQtdParcelas: plano.qtd_parcelas ?? 1,
        planoDiasPrimeiraParcela: plano.dias_primeira_parcela ?? undefined,
        planoIntervaloDias: plano.intervalo_dias ?? undefined,
      };
    }
  }

  return { origem: 'nenhum', linhas: [] };
};
