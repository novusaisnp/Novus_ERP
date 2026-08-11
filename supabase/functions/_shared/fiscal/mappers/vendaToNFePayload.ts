import { z } from 'https://esm.sh/zod@3.23.8';
import type { NFeEmitPayload, NFCePagamentoPayload } from '../providers/FiscalProvider.ts';

const enderecoSchema = z.object({
  logradouro: z.string().min(1, 'logradouro obrigatório'),
  numero: z.string().min(1, 'número obrigatório'),
  complemento: z.string().optional().nullable(),
  bairro: z.string().min(1, 'bairro obrigatório'),
  cidade: z.string().min(1, 'cidade obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
  cep: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 8, 'CEP deve ter 8 dígitos'),
});

export const clienteSchema = z.object({
  id: z.string().uuid(),
  tipo_pessoa: z.enum(['fisica', 'juridica', 'PF', 'PJ']).transform(v => v === 'PF' ? 'fisica' : v === 'PJ' ? 'juridica' : v),
  nome: z.string().min(1),
  razao_social: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  inscricao_estadual: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  qualificacao_fiscal: z.object({
    indicador_ie: z.enum(['1', '2', '9']),
    consumidor_final: z.boolean(),
  }),
}).and(enderecoSchema).superRefine((cliente, ctx) => {
  const documento = (cliente.tipo_pessoa === 'juridica' ? cliente.cnpj : cliente.cpf)?.replace(/\D/g, '') ?? '';
  const tamanho = cliente.tipo_pessoa === 'juridica' ? 14 : 11;
  if (documento.length !== tamanho) ctx.addIssue({ code: 'custom', message: 'CPF/CNPJ do cliente inválido' });
  if (cliente.qualificacao_fiscal.indicador_ie === '1' && !cliente.inscricao_estadual) {
    ctx.addIssue({ code: 'custom', message: 'Inscrição Estadual obrigatória para contribuinte de ICMS' });
  }
});

export const empresaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  cnpj: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 14, 'CNPJ da empresa inválido'),
  estado: z.string().length(2, 'UF da empresa deve ter 2 caracteres'),
});

const dadosFiscaisSchema = z.object({
  icms_situacao_tributaria: z.string().regex(/^\d{2,4}$/),
  icms_aliquota: z.coerce.number().min(0).max(100),
  pis_situacao_tributaria: z.string().regex(/^\d{2}$/),
  pis_aliquota: z.coerce.number().min(0).max(100),
  cofins_situacao_tributaria: z.string().regex(/^\d{2}$/),
  cofins_aliquota: z.coerce.number().min(0).max(100),
  ibs_cbs_situacao_tributaria: z.string().regex(/^\d{3}$/),
  ibs_cbs_classificacao_tributaria: z.string().regex(/^\d{6}$/),
  ibs_uf_aliquota: z.coerce.number().min(0).max(100),
  ibs_mun_aliquota: z.coerce.number().min(0).max(100),
  cbs_aliquota: z.coerce.number().min(0).max(100),
});

export const itemVendaSchema = z.object({
  id: z.string().uuid(),
  descricao: z.string().min(1),
  quantidade: z.coerce.number().positive(),
  unidade: z.string().min(1).default('UN'),
  preco_unitario: z.coerce.number().nonnegative(),
  valor_total_item: z.coerce.number().nonnegative(),
  tipo_item: z.enum(['P', 'S']).default('P'),
  produto: z.object({
    codigo: z.string().optional().nullable(),
    ncm: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 8, 'NCM deve ter 8 dígitos'),
    origem_produto: z.string().regex(/^[0-8]$/),
    dados_fiscais: dadosFiscaisSchema,
  }),
  cfop: z.string().regex(/^\d{4}$/).optional().nullable(),
});

export const vendaSchema = z.object({
  id: z.string().uuid(),
  empresa_representada_id: z.string().uuid(),
  cliente_id: z.string().uuid(),
  numero_venda: z.union([z.string(), z.number()]).optional().nullable(),
  data_venda: z.string(),
  valor_total: z.coerce.number().positive(),
  observacoes: z.string().optional().nullable(),
});

export const configFiscalSchema = z.object({
  serieNfe: z.coerce.number().int().min(1).max(999),
  cfopPadraoInterno: z.string().regex(/^\d{4}$/).default('5102'),
  cfopPadraoInterestadual: z.string().regex(/^\d{4}$/).default('6102'),
  naturezaOperacao: z.string().min(1).default('Venda de mercadoria'),
  regimeTributario: z.enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI']),
  cnpjEmitente: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 14, 'CNPJ emitente inválido'),
  inscricaoEstadual: z.string().min(1, 'Inscrição Estadual emitente obrigatória'),
});

export interface VendaToNFeContext {
  venda: unknown;
  cliente: unknown;
  empresa: unknown;
  itens: unknown[];
  configFiscal: unknown;
}

export class VendaMapperError extends Error {
  constructor(message: string, public readonly issues: unknown) {
    super(message);
    this.name = 'VendaMapperError';
  }
}

const FORMAS_PAGAMENTO_NFCE = {
  DINHEIRO: '01',
  CARTAO_CREDITO: '03',
  CARTAO_DEBITO: '04',
  BOLETO: '15',
  PIX: '17',
  TRANSFERENCIA: '18',
  CREDIARIO: '21',
} as const;

const pagamentoSchema = z.object({
  valor_liquido: z.coerce.number().positive(),
  bandeira: z.string().optional().nullable(),
  autorizacao_nsu: z.string().optional().nullable(),
  modalidade: z.object({ codigo: z.string() }),
});

export function pagamentosToNFCe(pagamentos: unknown[], valorTotal: number): NFCePagamentoPayload[] {
  const parsed = pagamentos.map((pagamento, index) => {
    const result = pagamentoSchema.safeParse(pagamento);
    if (!result.success) throw new VendaMapperError(`Dados inválidos: pagamentos[${index}]`, result.error.flatten());
    const formaPagamento = FORMAS_PAGAMENTO_NFCE[result.data.modalidade.codigo as keyof typeof FORMAS_PAGAMENTO_NFCE];
    if (!formaPagamento) {
      throw new VendaMapperError('Modalidade de pagamento sem código fiscal para NFC-e', { codigo: result.data.modalidade.codigo });
    }
    return {
      formaPagamento,
      valorPagamento: result.data.valor_liquido,
      bandeiraOperadora: result.data.bandeira ?? undefined,
      numeroAutorizacao: result.data.autorizacao_nsu ?? undefined,
    };
  });
  if (!parsed.length) throw new VendaMapperError('NFC-e exige ao menos uma forma de pagamento', { pagamentos: 'vazio' });
  const total = parsed.reduce((soma, pagamento) => soma + pagamento.valorPagamento, 0);
  if (Math.abs(total - valorTotal) > 0.01) {
    throw new VendaMapperError('Total dos pagamentos difere do total da venda', { totalPagamentos: total, totalVenda: valorTotal });
  }
  return parsed;
}

export function vendaToNFePayload(ctx: VendaToNFeContext): NFeEmitPayload {
  const parse = <T>(schema: z.ZodType<T>, data: unknown, label: string): T => {
    const result = schema.safeParse(data);
    if (!result.success) throw new VendaMapperError(`Dados inválidos: ${label}`, result.error.flatten());
    return result.data;
  };

  const venda = parse(vendaSchema, ctx.venda, 'venda');
  const cliente = parse(clienteSchema, ctx.cliente, 'cliente');
  const empresa = parse(empresaSchema, ctx.empresa, 'empresa');
  const config = parse(configFiscalSchema, ctx.configFiscal, 'configuração fiscal');
  const itens = ctx.itens.map((item, index) => parse(itemVendaSchema, item, `itens[${index}]`));

  if (!itens.length) throw new VendaMapperError('Venda sem itens não pode gerar NF-e', { itens: 'vazio' });
  if (itens.some(item => item.tipo_item !== 'P')) throw new VendaMapperError('NF-e aceita apenas produtos; serviços exigem NFS-e', { itens: 'contém serviço' });
  const totalItens = itens.reduce((total, item) => total + item.valor_total_item, 0);
  if (Math.abs(totalItens - venda.valor_total) > 0.01) {
    throw new VendaMapperError('Total dos itens difere do total da venda', { totalItens, totalVenda: venda.valor_total });
  }
  if (empresa.cnpj !== config.cnpjEmitente) {
    throw new VendaMapperError('CNPJ da configuração fiscal difere da empresa emitente', { empresa: empresa.cnpj, configuracao: config.cnpjEmitente });
  }

  const documento = ((cliente.tipo_pessoa === 'juridica' ? cliente.cnpj : cliente.cpf) ?? '').replace(/\D/g, '');
  const ufEmitente = empresa.estado.toUpperCase();
  const ufDestino = cliente.estado.toUpperCase();
  const cfopPadrao = ufDestino === ufEmitente ? config.cfopPadraoInterno : config.cfopPadraoInterestadual;
  const crt = config.regimeTributario === 'SIMPLES_NACIONAL' ? 1 : config.regimeTributario === 'MEI' ? 4 : 3;

  return {
    idempotencyKey: `venda-${venda.id}`,
    naturezaOperacao: config.naturezaOperacao,
    serie: config.serieNfe,
    // Numeração fiscal fica com o provedor; número da venda não é número de NF.
    dataEmissao: new Date().toISOString(),
    finalidade: 'normal',
    presencaComprador: 1,
    emitente: { cnpj: config.cnpjEmitente, inscricaoEstadual: config.inscricaoEstadual, regimeTributario: crt },
    localDestino: ufDestino === ufEmitente ? 1 : 2,
    consumidorFinal: cliente.qualificacao_fiscal.consumidor_final ? 1 : 0,
    indicadorIeDestinatario: Number(cliente.qualificacao_fiscal.indicador_ie) as 1 | 2 | 9,
    modalidadeFrete: 9,
    destinatario: {
      cnpjCpf: documento,
      nome: cliente.razao_social || cliente.nome,
      ie: cliente.inscricao_estadual || undefined,
      email: cliente.email || undefined,
      endereco: {
        logradouro: cliente.logradouro,
        numero: cliente.numero,
        complemento: cliente.complemento ?? undefined,
        bairro: cliente.bairro,
        municipio: cliente.cidade,
        uf: ufDestino,
        cep: cliente.cep,
      },
    },
    itens: itens.map(item => ({
      codigo: item.produto.codigo || item.id.slice(0, 8),
      descricao: item.descricao,
      ncm: item.produto.ncm,
      cfop: item.cfop || cfopPadrao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      valorUnitario: item.preco_unitario,
      valorTotal: item.valor_total_item,
      origem: item.produto.origem_produto,
      icmsSituacaoTributaria: item.produto.dados_fiscais.icms_situacao_tributaria,
      aliquotaIcms: item.produto.dados_fiscais.icms_aliquota,
      pisSituacaoTributaria: item.produto.dados_fiscais.pis_situacao_tributaria,
      aliquotaPis: item.produto.dados_fiscais.pis_aliquota,
      cofinsSituacaoTributaria: item.produto.dados_fiscais.cofins_situacao_tributaria,
      aliquotaCofins: item.produto.dados_fiscais.cofins_aliquota,
      ibsCbsSituacaoTributaria: item.produto.dados_fiscais.ibs_cbs_situacao_tributaria,
      ibsCbsClassificacaoTributaria: item.produto.dados_fiscais.ibs_cbs_classificacao_tributaria,
      aliquotaIbsUf: item.produto.dados_fiscais.ibs_uf_aliquota,
      aliquotaIbsMunicipio: item.produto.dados_fiscais.ibs_mun_aliquota,
      aliquotaCbs: item.produto.dados_fiscais.cbs_aliquota,
    })),
    valorTotal: venda.valor_total,
    observacoes: venda.observacoes ?? undefined,
  };
}
