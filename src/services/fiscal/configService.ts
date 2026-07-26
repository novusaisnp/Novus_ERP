
import { supabase } from "@/integrations/supabase/client";
import { ConfiguracaoFiscal } from "@/types/fiscal";

console.log('[Fiscal] Inicializando serviço de configurações fiscais');

export const fetchConfiguracoesFiscais = async (): Promise<ConfiguracaoFiscal[]> => {
  console.log('[Fiscal] Buscando configurações fiscais');
  const { data, error } = await supabase
    .from('configuracoes_fiscais')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[Fiscal] Erro ao buscar configurações fiscais:', error);
    throw error;
  }
  
  if (!data) return [];
  
  return data.map((item) => ({
    id: item.id,
    empresaRepresentadaId: item.empresa_representada_id,
    ambiente: item.ambiente as ConfiguracaoFiscal['ambiente'],
    certificadoDigital: item.certificado_digital,
    senhaCertificado: item.senha_certificado,
    regimeTributario: item.regime_tributario as ConfiguracaoFiscal['regimeTributario'],
    aliquotaIcmsPadrao: Number(item.aliquota_icms_padrao || 0),
    aliquotaIpiPadrao: Number(item.aliquota_ipi_padrao || 0),
    aliquotaPisPadrao: Number(item.aliquota_pis_padrao || 0),
    aliquotaCofinsPadrao: Number(item.aliquota_cofins_padrao || 0),
    aliquotaIssPadrao: Number(item.aliquota_iss_padrao || 0),
    serieNfe: item.serie_nfe,
    numeroUltimoNfe: item.numero_ultimo_nfe,
    serieNfce: item.serie_nfce,
    numeroUltimoNfce: item.numero_ultimo_nfce,
    ativo: item.ativo,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }));
};

export const createConfiguracaoFiscal = async (config: Omit<ConfiguracaoFiscal, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfiguracaoFiscal> => {
  console.log('[Fiscal] Criando configuração fiscal:', config);
  const { data, error } = await supabase
    .from('configuracoes_fiscais')
    .insert([{
      empresa_representada_id: config.empresaRepresentadaId,
      ambiente: config.ambiente,
      certificado_digital: config.certificadoDigital,
      senha_certificado: config.senhaCertificado,
      regime_tributario: config.regimeTributario,
      aliquota_icms_padrao: config.aliquotaIcmsPadrao,
      aliquota_ipi_padrao: config.aliquotaIpiPadrao,
      aliquota_pis_padrao: config.aliquotaPisPadrao,
      aliquota_cofins_padrao: config.aliquotaCofinsPadrao,
      aliquota_iss_padrao: config.aliquotaIssPadrao,
      serie_nfe: config.serieNfe,
      numero_ultimo_nfe: config.numeroUltimoNfe,
      serie_nfce: config.serieNfce,
      numero_ultimo_nfce: config.numeroUltimoNfce,
      ativo: config.ativo
    }])
    .select()
    .single();
  
  if (error) {
    console.error('[Fiscal] Erro ao criar configuração fiscal:', error);
    throw error;
  }
  
  if (!data) {
    throw new Error('Nenhum dados retornado após inserção');
  }
  
  const item = data;
  return {
    id: item.id,
    empresaRepresentadaId: item.empresa_representada_id,
    ambiente: item.ambiente as ConfiguracaoFiscal['ambiente'],
    certificadoDigital: item.certificado_digital,
    senhaCertificado: item.senha_certificado,
    regimeTributario: item.regime_tributario as ConfiguracaoFiscal['regimeTributario'],
    aliquotaIcmsPadrao: Number(item.aliquota_icms_padrao || 0),
    aliquotaIpiPadrao: Number(item.aliquota_ipi_padrao || 0),
    aliquotaPisPadrao: Number(item.aliquota_pis_padrao || 0),
    aliquotaCofinsPadrao: Number(item.aliquota_cofins_padrao || 0),
    aliquotaIssPadrao: Number(item.aliquota_iss_padrao || 0),
    serieNfe: item.serie_nfe,
    numeroUltimoNfe: item.numero_ultimo_nfe,
    serieNfce: item.serie_nfce,
    numeroUltimoNfce: item.numero_ultimo_nfce,
    ativo: item.ativo,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
};

export const validarCertificadoDigital = (arquivo: File): Promise<boolean> => {
  console.log('[Fiscal] Validando certificado digital:', arquivo.name);
  return new Promise((resolve) => {
    const extensoesValidas = ['.pfx', '.p12', '.pem'];
    const extensao = arquivo.name.toLowerCase().substring(arquivo.name.lastIndexOf('.'));
    
    if (extensoesValidas.includes(extensao)) {
      console.log('[Fiscal] Certificado digital válido');
      resolve(true);
    } else {
      console.warn('[Fiscal] Certificado digital inválido - extensão não suportada');
      resolve(false);
    }
  });
};
