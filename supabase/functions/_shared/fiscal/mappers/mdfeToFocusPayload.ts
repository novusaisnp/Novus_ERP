import { z } from 'https://esm.sh/zod@3.23.8';

const digits = (length: number) => z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === length);
const municipio = z.object({ codigo: digits(7), nome: z.string().min(2).max(60) });

export const emitirMDFeSchema = z.object({
  idempotencyKey: z.string().uuid(),
  empresaId: z.string().uuid(),
  emitenteTipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  transportadorTipo: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  ufInicio: z.string().length(2),
  ufFim: z.string().length(2),
  municipioCarregamento: municipio,
  municipioDescarregamento: municipio,
  percursos: z.array(z.string().length(2)).max(25).default([]),
  dataHoraPrevistoInicioViagem: z.string().datetime({ offset: true }).optional(),
  valorTotalCarga: z.coerce.number().positive(),
  pesoBruto: z.coerce.number().positive(),
  unidadePeso: z.enum(['01', '02']),
  tipoCarga: z.enum(['01','02','03','04','05','06','07','08','09','10','11','12']),
  descricaoProduto: z.string().min(2).max(120),
  ncmProduto: digits(8).optional(),
  veiculo: z.object({
    codigo: z.string().max(10).optional(),
    placa: z.string().transform(v => v.replace(/[^A-Za-z0-9]/g, '').toUpperCase()).refine(v => v.length === 7),
    renavam: z.string().regex(/^\d{9,11}$/).optional(),
    tara: z.coerce.number().int().positive().max(999999),
    capacidadeKg: z.coerce.number().int().positive().max(999999).optional(),
    capacidadeM3: z.coerce.number().int().positive().max(999).optional(),
    tipoRodado: z.enum(['01','02','03','04','05','06']),
    tipoCarroceria: z.enum(['00','01','02','03','04','05']),
    ufLicenciamento: z.string().length(2),
  }),
  condutores: z.array(z.object({ nome: z.string().min(2).max(60), cpf: digits(11) })).min(1).max(10),
  seguro: z.object({
    responsavelSeguro: z.enum(['1', '2']),
    cnpjResponsavel: digits(14).optional(),
    cpfResponsavel: digits(11).optional(),
    nomeSeguradora: z.string().min(1).max(30),
    cnpjSeguradora: digits(14),
    numeroApolice: z.string().min(1).max(20),
    numeroAverbacao: z.string().min(1).max(40),
  }).superRefine((seguro, ctx) => {
    if (seguro.responsavelSeguro === '2' && !seguro.cnpjResponsavel && !seguro.cpfResponsavel) {
      ctx.addIssue({ code: 'custom', message: 'CPF ou CNPJ do contratante responsável pelo seguro é obrigatório' });
    }
  }),
  documentoIds: z.array(z.string().uuid()).min(1).max(20000),
});

export type EmitirMDFeInput = z.infer<typeof emitirMDFeSchema>;

export interface MDFeEmpresa {
  cnpj: string;
  inscricaoEstadual: string;
  serie: number;
  rntrc: string;
}

export interface MDFeDocumento {
  id: string;
  chave: string;
}

export function mdfeToFocusPayload(input: EmitirMDFeInput, empresa: MDFeEmpresa, documentos: MDFeDocumento[]) {
  return {
    emitente: input.emitenteTipo,
    tipo_transporte: input.transportadorTipo,
    serie: empresa.serie,
    data_emissao: new Date().toISOString(),
    uf_inicio: input.ufInicio.toUpperCase(),
    uf_fim: input.ufFim.toUpperCase(),
    municipios_carregamento: [{ codigo: input.municipioCarregamento.codigo, nome: input.municipioCarregamento.nome }],
    percursos: input.percursos.map(uf => ({ uf_percurso: uf.toUpperCase() })),
    data_hora_previsto_inicio_viagem: input.dataHoraPrevistoInicioViagem,
    cnpj_emitente: empresa.cnpj,
    inscricao_estadual_emitente: empresa.inscricaoEstadual,
    municipios_descarregamento: [{
      codigo: input.municipioDescarregamento.codigo,
      nome: input.municipioDescarregamento.nome,
      notas_fiscais: documentos.map(documento => ({ chave_nfe: documento.chave })),
    }],
    seguros_carga: [{
      responsavel_seguro: input.seguro.responsavelSeguro,
      cnpj_responsavel: input.seguro.cnpjResponsavel,
      cpf_responsavel: input.seguro.cpfResponsavel,
      nome_seguradora: input.seguro.nomeSeguradora,
      cnpj_seguradora: input.seguro.cnpjSeguradora,
      numero_apolice: input.seguro.numeroApolice,
      numero_averbacao: input.seguro.numeroAverbacao,
    }],
    tipo_carga: input.tipoCarga,
    descricao_produto: input.descricaoProduto,
    codigo_ncm_produto: input.ncmProduto,
    quantidade_total_nfe: documentos.length,
    valor_total_carga: input.valorTotalCarga,
    codigo_unidade_medida_peso_bruto: input.unidadePeso,
    peso_bruto: input.pesoBruto,
    registro_nacional_transporte: empresa.rntrc,
    veiculo_tracao: {
      codigo_veiculo: input.veiculo.codigo,
      placa_veiculo: input.veiculo.placa,
      renavam_veiculo: input.veiculo.renavam,
      tara_veiculo: input.veiculo.tara,
      capacidade_kg_veiculo: input.veiculo.capacidadeKg,
      capacidade_m3_veiculo: input.veiculo.capacidadeM3,
      condutores: input.condutores,
      tipo_rodado_veiculo: input.veiculo.tipoRodado,
      tipo_carroceria_veiculo: input.veiculo.tipoCarroceria,
      uf_licenciamento_veiculo: input.veiculo.ufLicenciamento.toUpperCase(),
    },
  };
}
