import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

export interface NFeAutorizada {
  id: string;
  chave_acesso: string;
  numero: number | null;
  serie: number | null;
  valor_total: number | null;
  data_emissao: string | null;
}

export interface EmitirMDFeInput {
  idempotencyKey: string;
  emitenteTipo: 1 | 2 | 3;
  transportadorTipo?: 1 | 2 | 3;
  ufInicio: string;
  ufFim: string;
  municipioCarregamento: { codigo: string; nome: string };
  municipioDescarregamento: { codigo: string; nome: string };
  percursos: string[];
  dataHoraPrevistoInicioViagem?: string;
  valorTotalCarga: number;
  pesoBruto: number;
  unidadePeso: '01' | '02';
  tipoCarga: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';
  descricaoProduto: string;
  ncmProduto?: string;
  veiculo: {
    codigo?: string; placa: string; renavam?: string; tara: number; capacidadeKg?: number; capacidadeM3?: number;
    tipoRodado: '01' | '02' | '03' | '04' | '05' | '06'; tipoCarroceria: '00' | '01' | '02' | '03' | '04' | '05'; ufLicenciamento: string;
  };
  condutores: Array<{ nome: string; cpf: string }>;
  seguro: {
    responsavelSeguro: '1' | '2'; cnpjResponsavel?: string; cpfResponsavel?: string;
    nomeSeguradora: string; cnpjSeguradora: string; numeroApolice: string; numeroAverbacao: string;
  };
  documentoIds: string[];
}

export async function listNFeAutorizadas(): Promise<NFeAutorizada[]> {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase.from('fiscal_documentos_eletronicos')
    .select('id,chave_acesso,numero,serie,valor_total,data_emissao')
    .eq('empresa_representada_id', empresaId).eq('tipo', 'NFE').eq('status', 'AUTORIZADA')
    .is('deleted_at', null).order('data_emissao', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).filter(item => /^\d{44}$/.test(item.chave_acesso ?? '')) as NFeAutorizada[];
}

export async function emitirMDFe(input: EmitirMDFeInput) {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase.functions.invoke('fiscal-emitir-mdfe', { body: { ...input, empresaId } });
  if (error) throw error;
  if (!data?.documento_id) throw new Error(data?.message ?? 'Resposta inválida na emissão do MDF-e.');
  return data as { ok: boolean; documento_id: string; operacao_id: string; status: string; mock: boolean };
}

async function eventoMDFe(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('fiscal-evento-mdfe', { body });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message ?? 'Evento de MDF-e não confirmado.');
  return data as { ok: boolean; status: string };
}

export const encerrarMDFe = (documentoId: string, data: string, uf: string, municipio: string) =>
  eventoMDFe({ documentoId, acao: 'encerrar', data, uf, municipio });

export const incluirCondutorMDFe = (documentoId: string, nome: string, cpf: string) =>
  eventoMDFe({ documentoId, acao: 'incluir_condutor', nome, cpf });
