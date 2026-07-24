// Contratos canônicos das entidades core do NOVUS ERP — a "língua universal"
// para a qual qualquer sistema satélite (PDV, sistema escolar, etc.) deve
// traduzir seus dados antes da ingestão.
//
// Fonte de verdade: alinhado com src/types/*.ts (formato usado pelo frontend)
// e com as colunas reais do Postgres (supabase/migrations). Quando os dois
// divergem, o schema aqui segue o banco, por ser o destino final do dado.
//
// Cada entidade exporta um `*ObjectSchema` (ZodObject puro, usável com
// `.partial()` para validar updates parciais) e um `*Schema` (com as
// regras cruzadas via superRefine, para validar o registro completo em
// inserts). Ver docs/CONTRATOS_CANONICOS_ERP.md para o contrato completo,
// versionamento e exemplos de mapeamento de sistemas satélite.

import { z } from 'https://esm.sh/zod@3.23.8';
import { origemEnvelopeSchema } from './envelope.ts';
import { isValidCPF, isValidCNPJ } from './documentValidators.ts';

// -------------------- Cliente --------------------
// NOTA: origem_sistema/externo_id ainda não têm coluna própria na tabela
// `clientes` (só `contas_receber` tem hoje — ver FIN-E5). O envelope aqui
// define o contrato-alvo; extensão do schema do banco é trabalho futuro
// (ver docs/CONTRATOS_CANONICOS_ERP.md, Fase 1b).
export const clienteCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  nome: z.string().min(1, 'nome é obrigatório'),
  tipo: z.enum(['F', 'J']),
  apelido: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  cpf_cnpj: z.string().regex(/^\d{11}$|^\d{14}$/, 'CPF/CNPJ deve conter 11 ou 14 dígitos numéricos').optional().nullable(),
  ativo: z.boolean().default(true),
}).merge(origemEnvelopeSchema);

export const clienteCanonicalSchema = clienteCanonicalObjectSchema.superRefine((c, ctx) => {
  const doc = c.cpf_cnpj ?? '';
  if (c.tipo === 'J' && doc && !isValidCNPJ(doc)) {
    ctx.addIssue({ code: 'custom', path: ['cpf_cnpj'], message: 'CNPJ inválido (dígito verificador não confere)' });
  }
  if (c.tipo === 'F' && doc && !isValidCPF(doc)) {
    ctx.addIssue({ code: 'custom', path: ['cpf_cnpj'], message: 'CPF inválido (dígito verificador não confere)' });
  }
});

// -------------------- Produto --------------------
// Mesma nota do Cliente: envelope de origem é contrato-alvo, não persistido
// ainda em `produtos`.
export const produtoCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  nome: z.string().min(1, 'nome é obrigatório'),
  codigo: z.string().optional().nullable(),
  categoria_id: z.string().uuid().optional().nullable(),
  preco_custo: z.coerce.number().nonnegative().optional().nullable(),
  preco_venda: z.coerce.number().nonnegative(),
  ncm: z.string().optional().nullable(),
  estoque_atual: z.coerce.number().optional().nullable(),
  estoque_minimo: z.coerce.number().optional().nullable(),
  controla_estoque: z.boolean().default(true),
  ativo: z.boolean().default(true),
}).merge(origemEnvelopeSchema);

export const produtoCanonicalSchema = produtoCanonicalObjectSchema;

// -------------------- Venda + Itens --------------------
// `vendas` já tem coluna hash_payload (ver migração 20260711114840); as
// demais colunas do envelope vivem em venda_pagamento/venda_pagamento_parcelas
// (documentado no contrato completo).
export const itemVendaCanonicalSchema = z.object({
  produto_id: z.string().uuid().optional().nullable(),
  servico_id: z.string().uuid().optional().nullable(),
  descricao: z.string().min(1, 'descrição do item é obrigatória'),
  quantidade: z.coerce.number().positive('quantidade deve ser maior que zero'),
  preco_unitario: z.coerce.number().nonnegative(),
  desconto_item: z.coerce.number().nonnegative().optional().nullable(),
  acrescimo_item: z.coerce.number().nonnegative().optional().nullable(),
});

export const vendaCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  cliente_id: z.string().uuid().optional().nullable(),
  numero_venda: z.string().optional().nullable(),
  data_venda: z.string().refine(v => !isNaN(Date.parse(v)), 'data_venda inválida'),
  status: z.enum(['RASCUNHO', 'CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE', 'CANCELADO']),
  valor_total: z.coerce.number().nonnegative().optional().nullable(),
  itens: z.array(itemVendaCanonicalSchema).optional(),
}).merge(origemEnvelopeSchema);

export const vendaCanonicalSchema = vendaCanonicalObjectSchema.superRefine((v, ctx) => {
  if (v.itens && v.itens.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['itens'], message: 'venda sem itens' });
  }
});

// -------------------- ContaReceber --------------------
// Único que já persiste o envelope completo no banco hoje (FIN-E5,
// migração 20260711120808) — os demais devem convergir para este formato.
export const contaReceberCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  descricao: z.string().min(1, 'descrição é obrigatória'),
  numero_documento: z.string().optional().nullable(),
  cliente_id: z.string().uuid().optional().nullable(),
  valor_original: z.coerce.number().positive('valor_original deve ser maior que zero'),
  data_emissao: z.string().refine(v => !isNaN(Date.parse(v)), 'data_emissao inválida').optional().nullable(),
  data_vencimento: z.string().refine(v => !isNaN(Date.parse(v)), 'data_vencimento é obrigatória e deve ser válida'),
  status: z.enum(['PENDENTE', 'RECEBIDO', 'PARCIAL', 'VENCIDO', 'CANCELADO']).default('PENDENTE'),
  venda_id: z.string().uuid().optional().nullable(),
  venda_pagamento_id: z.string().uuid().optional().nullable(),
  venda_pagamento_parcela_id: z.string().uuid().optional().nullable(),
}).merge(origemEnvelopeSchema);

export const contaReceberCanonicalSchema = contaReceberCanonicalObjectSchema.superRefine((c, ctx) => {
  if (c.data_emissao && c.data_vencimento) {
    if (Date.parse(c.data_vencimento) < Date.parse(c.data_emissao)) {
      ctx.addIssue({ code: 'custom', path: ['data_vencimento'], message: 'data de vencimento não pode ser anterior à data de emissão' });
    }
  }
});

// -------------------- Contrato --------------------
export const contratoCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  cliente_id: z.string().uuid().optional().nullable(),
  numero_contrato: z.string().optional().nullable(),
  titulo: z.string().min(1, 'título é obrigatório'),
  status: z.enum(['RASCUNHO', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'CANCELADO']),
  data_inicio: z.string().refine(v => !isNaN(Date.parse(v)), 'data_inicio é obrigatória e deve ser válida'),
  data_fim: z.string().refine(v => !isNaN(Date.parse(v)), 'data_fim inválida').optional().nullable(),
  valor_mensal: z.coerce.number().positive().optional().nullable(),
  valor_total: z.coerce.number().nonnegative().optional().nullable(),
}).merge(origemEnvelopeSchema);

export const contratoCanonicalSchema = contratoCanonicalObjectSchema.superRefine((c, ctx) => {
  if (c.data_fim && Date.parse(c.data_fim) <= Date.parse(c.data_inicio)) {
    ctx.addIssue({ code: 'custom', path: ['data_fim'], message: 'data de fim deve ser posterior à data de início' });
  }
});

// Schemas completos (com regras cruzadas) — usados para validar inserts.
export const canonicalSchemas = {
  clientes: clienteCanonicalSchema,
  produtos: produtoCanonicalSchema,
  vendas: vendaCanonicalSchema,
  contratos: contratoCanonicalSchema,
  contas_receber: contaReceberCanonicalSchema,
} as const;

// Schemas-objeto puros (sem regras cruzadas) — usados via `.partial()` para
// validar updates parciais, onde campos obrigatórios podem estar ausentes.
export const canonicalObjectSchemas = {
  clientes: clienteCanonicalObjectSchema,
  produtos: produtoCanonicalObjectSchema,
  vendas: vendaCanonicalObjectSchema,
  contratos: contratoCanonicalObjectSchema,
  contas_receber: contaReceberCanonicalObjectSchema,
} as const;

export type CanonicalTable = keyof typeof canonicalSchemas;
