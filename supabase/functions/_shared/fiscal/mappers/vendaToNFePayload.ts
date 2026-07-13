// Converte uma Venda (com itens, cliente, empresa e config fiscal) em payload
// compatível com a interface FiscalProvider.
//
// Todo dado obrigatório para SEFAZ é validado com Zod ANTES da chamada ao provedor,
// evitando ida-e-volta com rejeição por dados cadastrais incompletos.

import { z } from 'https://esm.sh/zod@3.23.8';
import type { NFeEmitPayload } from '../providers/FiscalProvider.ts';

// -------------------- Schemas de entrada --------------------

const enderecoSchema = z.object({
  logradouro: z.string().min(1, 'logradouro obrigatório'),
  numero: z.string().min(1, 'número obrigatório'),
  complemento: z.string().optional().nullable(),
  bairro: z.string().min(1, 'bairro obrigatório'),
  cidade: z.string().min(1, 'cidade obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
  cep: z.string().regex(/^\d{8}$/, 'CEP deve ter 8 dígitos numéricos'),
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
}).and(enderecoSchema.partial()).superRefine((c, ctx) => {
  const doc = (c.tipo_pessoa === 'juridica' ? c.cnpj : c.cpf) ?? '';
  const clean = doc.replace(/\D/g, '');
  if (c.tipo_pessoa === 'juridica' && clean.length !== 14) {
    ctx.addIssue({ code: 'custom', message: 'CNPJ do cliente inválido' });
  }
  if (c.tipo_pessoa === 'fisica' && clean.length !== 11) {
    ctx.addIssue({ code: 'custom', message: 'CPF do cliente inválido' });
  }
});

export const empresaSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1),
  cnpj: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 14, 'CNPJ da empresa inválido'),
});

export const itemVendaSchema = z.object({
  id: z.string().uuid(),
  descricao: z.string().min(1),
  quantidade: z.coerce.number().positive(),
  unidade: z.string().min(1).default('UN'),
  preco_unitario: z.coerce.number().nonnegative(),
  valor_total_item: z.coerce.number().nonnegative(),
  produto_codigo: z.string().optional().nullable(),
  produto_ncm: z.string().optional().nullable(),
  cfop: z.string().optional().nullable(),
  cst: z.string().optional().nullable(),
  origem: z.string().optional().nullable(),
  aliquota_icms: z.coerce.number().optional().nullable(),
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
  serieNfe: z.coerce.number().default(1),
  cfopPadraoInterno: z.string().default('5102'),
  cfopPadraoInterestadual: z.string().default('6102'),
  ncmPadrao: z.string().default('00000000'),
  naturezaOperacao: z.string().default('Venda de mercadoria'),
});

export type VendaInput = z.infer<typeof vendaSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;
export type EmpresaInput = z.infer<typeof empresaSchema>;
export type ItemVendaInput = z.infer<typeof itemVendaSchema>;
export type ConfigFiscalInput = z.infer<typeof configFiscalSchema>;

export interface VendaToNFeContext {
  venda: unknown;
  cliente: unknown;
  empresa: unknown;
  itens: unknown[];
  configFiscal?: unknown;
}

export class VendaMapperError extends Error {
  constructor(message: string, public readonly issues: unknown) {
    super(message);
    this.name = 'VendaMapperError';
  }
}

// -------------------- Mapper --------------------

export function vendaToNFePayload(ctx: VendaToNFeContext): NFeEmitPayload {
  const parseSafe = <T>(schema: z.ZodType<T>, data: unknown, label: string): T => {
    const r = schema.safeParse(data);
    if (!r.success) {
      throw new VendaMapperError(`Dados inválidos: ${label}`, r.error.flatten());
    }
    return r.data;
  };

  const venda = parseSafe(vendaSchema, ctx.venda, 'venda');
  const cliente = parseSafe(clienteSchema, ctx.cliente, 'cliente');
  const empresa = parseSafe(empresaSchema, ctx.empresa, 'empresa');
  const config = parseSafe(configFiscalSchema, ctx.configFiscal ?? {}, 'configFiscal');
  const itens = ctx.itens.map((it, i) => parseSafe(itemVendaSchema, it, `itens[${i}]`));

  if (itens.length === 0) {
    throw new VendaMapperError('Venda sem itens não pode gerar NF-e', { itens: 'vazio' });
  }

  const docCliente = ((cliente.tipo_pessoa === 'juridica' ? cliente.cnpj : cliente.cpf) ?? '').replace(/\D/g, '');
  const ufEmitente = 'SP'; // TODO: derivar de empresas_representadas.estado quando disponível
  const ufDestino = cliente.estado ?? ufEmitente;
  const cfopPadrao = ufDestino === ufEmitente ? config.cfopPadraoInterno : config.cfopPadraoInterestadual;

  return {
    idempotencyKey: `venda-${venda.id}`,
    naturezaOperacao: config.naturezaOperacao,
    serie: config.serieNfe,
    numero: typeof venda.numero_venda === 'number' ? venda.numero_venda : undefined,
    dataEmissao: new Date(venda.data_venda).toISOString(),
    finalidade: 'normal',
    presencaComprador: 1,
    destinatario: {
      cnpjCpf: docCliente,
      nome: cliente.razao_social || cliente.nome,
      ie: cliente.inscricao_estadual || undefined,
      email: cliente.email || undefined,
      endereco: {
        logradouro: cliente.logradouro ?? '',
        numero: cliente.numero ?? 'S/N',
        complemento: cliente.complemento ?? undefined,
        bairro: cliente.bairro ?? '',
        municipio: cliente.cidade ?? '',
        uf: (cliente.estado ?? ufEmitente).toUpperCase(),
        cep: (cliente.cep ?? '').replace(/\D/g, ''),
      },
    },
    itens: itens.map((it) => ({
      codigo: it.produto_codigo || it.id.slice(0, 8),
      descricao: it.descricao,
      ncm: (it.produto_ncm || config.ncmPadrao).replace(/\D/g, '').padStart(8, '0'),
      cfop: it.cfop || cfopPadrao,
      unidade: it.unidade,
      quantidade: it.quantidade,
      valorUnitario: it.preco_unitario,
      valorTotal: it.valor_total_item,
      cst: it.cst || '00',
      origem: it.origem || '0',
      aliquotaIcms: it.aliquota_icms ?? 0,
    })),
    valorTotal: venda.valor_total,
    observacoes: venda.observacoes ?? undefined,
  };
}
