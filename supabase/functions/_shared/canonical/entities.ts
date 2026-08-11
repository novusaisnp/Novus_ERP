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

// -------------------- Entidade (Cadastro Unificado) --------------------
// Substitui Cliente como contrato-alvo pro Cadastro Unificado de Entidades
// (ver docs/CONTRATOS_CANONICOS_ERP.md e o plano da refatoração). Cliente
// continua aceito (janela expand-contract: satélites que ainda mandam
// `table:'clientes'` não quebram) até todos migrarem pra `table:'entidades'`
// com `papeis` explícito.
const PAPEL_CODIGOS = ['CLIENTE', 'FORNECEDOR', 'PRESTADOR', 'COLABORADOR', 'SOCIO', 'REPRESENTANTE_LEGAL', 'PROCURADOR'] as const;
const PAPEL_TIPO_PERMITIDO: Record<(typeof PAPEL_CODIGOS)[number], 'PF' | 'PJ' | 'AMBOS'> = {
  CLIENTE: 'AMBOS',
  FORNECEDOR: 'AMBOS',
  PRESTADOR: 'AMBOS',
  COLABORADOR: 'PF',
  SOCIO: 'PF',
  REPRESENTANTE_LEGAL: 'PF',
  PROCURADOR: 'PF',
};

export const entidadeCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  tipo_pessoa: z.enum(['PF', 'PJ']),
  nome: z.string().min(1, 'nome é obrigatório'),
  razao_social: z.string().optional().nullable(),
  nome_fantasia: z.string().optional().nullable(),
  apelido: z.string().optional().nullable(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos').optional().nullable(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos').optional().nullable(),
  rg: z.string().optional().nullable(),
  inscricao_estadual: z.string().optional().nullable(),
  inscricao_municipal: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  email_secundario: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  telefone_secundario: z.string().optional().nullable(),
  celular: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  banco: z.string().optional().nullable(),
  agencia: z.string().optional().nullable(),
  conta: z.string().optional().nullable(),
  tipo_conta: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
  papeis: z.array(z.enum(PAPEL_CODIGOS)).min(1, 'entidade precisa de pelo menos um papel'),
}).merge(origemEnvelopeSchema);

export const entidadeCanonicalSchema = entidadeCanonicalObjectSchema.superRefine((e, ctx) => {
  if (e.tipo_pessoa === 'PJ' && e.cnpj && !isValidCNPJ(e.cnpj)) {
    ctx.addIssue({ code: 'custom', path: ['cnpj'], message: 'CNPJ inválido (dígito verificador não confere)' });
  }
  if (e.tipo_pessoa === 'PF' && e.cpf && !isValidCPF(e.cpf)) {
    ctx.addIssue({ code: 'custom', path: ['cpf'], message: 'CPF inválido (dígito verificador não confere)' });
  }
  for (const papel of e.papeis) {
    const permitido = PAPEL_TIPO_PERMITIDO[papel];
    if (permitido !== 'AMBOS' && permitido !== e.tipo_pessoa) {
      ctx.addIssue({ code: 'custom', path: ['papeis'], message: `papel ${papel} não permite entidade do tipo ${e.tipo_pessoa} (permitido: ${permitido})` });
    }
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
  // vendedor_id (migração 20260727130000) aponta para usuarios.id — um satélite
  // só deve preenchê-lo quando já souber resolver seu vendedor/operador para um
  // usuário real do NOVUS (ex.: um PDV com login federado). Sem essa resolução,
  // deixar ausente/null é o caminho normal — nunca bloqueia a ingestão.
  vendedor_id: z.string().uuid().optional().nullable(),
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

// -------------------- Estoque: Movimentação --------------------
// A entidade mais crítica para um satélite tipo PDV: toda venda de balcão
// deve gerar uma movimentação de saída correspondente. `venda_id` já existe
// na tabela (rastreabilidade nativa), mas o envelope de origem
// (origem_sistema/idempotency_key) ainda não — mesma nota de Cliente/Produto.
export const estoqueMovimentacaoCanonicalObjectSchema = z.object({
  empresa_representada_id: z.string().uuid(),
  produto_id: z.string().uuid(),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'INVENTARIO']),
  quantidade: z.coerce.number().positive('quantidade deve ser maior que zero'),
  custo_unitario: z.coerce.number().nonnegative().optional().nullable(),
  localizacao_origem_id: z.string().uuid().optional().nullable(),
  localizacao_destino_id: z.string().uuid().optional().nullable(),
  documento_ref: z.string().optional().nullable(),
  venda_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().optional().nullable(),
}).merge(origemEnvelopeSchema);

export const estoqueMovimentacaoCanonicalSchema = estoqueMovimentacaoCanonicalObjectSchema.superRefine((m, ctx) => {
  if (m.tipo === 'TRANSFERENCIA' && (!m.localizacao_origem_id || !m.localizacao_destino_id)) {
    ctx.addIssue({ code: 'custom', path: ['localizacao_destino_id'], message: 'transferência exige localização de origem e de destino' });
  }
  if ((m.tipo === 'SAIDA' || m.tipo === 'AJUSTE_NEGATIVO') && !m.localizacao_origem_id) {
    ctx.addIssue({ code: 'custom', path: ['localizacao_origem_id'], message: `${m.tipo.toLowerCase()} exige localização de origem` });
  }
  if ((m.tipo === 'ENTRADA' || m.tipo === 'AJUSTE_POSITIVO') && !m.localizacao_destino_id) {
    ctx.addIssue({ code: 'custom', path: ['localizacao_destino_id'], message: `${m.tipo.toLowerCase()} exige localização de destino` });
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

// -------------------- Liquidação de Título (Porta 2) --------------------
// O evento "isso foi pago" — desacoplado de como o título nasceu (Venda,
// Contrato, ou lançamento direto). Tabela real: liquidacoes_titulos.
// Ver docs/CONTRATOS_CANONICOS_ERP.md §2 (Porta 2) e §5 (Vínculo Usuário).
export const multiBaixaCanonicalSchema = z.object({
  conta_bancaria_id: z.string().uuid(),
  valor: z.coerce.number().positive('valor da baixa deve ser maior que zero'),
  observacoes: z.string().optional().nullable(),
});

export const liquidacaoCanonicalObjectSchema = z.object({
  titulo_id: z.string().uuid(),
  tipo_titulo: z.enum(['CONTAS_PAGAR', 'CONTAS_RECEBER']),
  valor_pago: z.coerce.number().positive('valor_pago deve ser maior que zero'),
  data_pagamento: z.string().refine(v => !isNaN(Date.parse(v)), 'data_pagamento inválida'),
  forma_pagamento: z.enum(['DINHEIRO', 'TRANSFERENCIA', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'CHEQUE', 'DEPOSITO']),
  conta_bancaria_id: z.string().uuid().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  multi_baixa: z.array(multiBaixaCanonicalSchema).optional(),
}).merge(origemEnvelopeSchema);

export const liquidacaoCanonicalSchema = liquidacaoCanonicalObjectSchema.superRefine((l, ctx) => {
  if (l.multi_baixa && l.multi_baixa.length > 0) {
    const soma = l.multi_baixa.reduce((acc, b) => acc + b.valor, 0);
    if (Math.abs(soma - l.valor_pago) > 0.01) {
      ctx.addIssue({ code: 'custom', path: ['multi_baixa'], message: `soma das baixas (${soma}) diverge do valor_pago (${l.valor_pago})` });
    }
  }
});

// Schemas completos (com regras cruzadas) — usados para validar inserts.
export const canonicalSchemas = {
  clientes: clienteCanonicalSchema,
  entidades: entidadeCanonicalSchema,
  produtos: produtoCanonicalSchema,
  vendas: vendaCanonicalSchema,
  contratos: contratoCanonicalSchema,
  contas_receber: contaReceberCanonicalSchema,
  estoque_movimentacoes: estoqueMovimentacaoCanonicalSchema,
  liquidacoes_titulos: liquidacaoCanonicalSchema,
} as const;

// Schemas-objeto puros (sem regras cruzadas) — usados via `.partial()` para
// validar updates parciais, onde campos obrigatórios podem estar ausentes.
export const canonicalObjectSchemas = {
  clientes: clienteCanonicalObjectSchema,
  entidades: entidadeCanonicalObjectSchema,
  produtos: produtoCanonicalObjectSchema,
  vendas: vendaCanonicalObjectSchema,
  contratos: contratoCanonicalObjectSchema,
  contas_receber: contaReceberCanonicalObjectSchema,
  estoque_movimentacoes: estoqueMovimentacaoCanonicalObjectSchema,
  liquidacoes_titulos: liquidacaoCanonicalObjectSchema,
} as const;

export type CanonicalTable = keyof typeof canonicalSchemas;
