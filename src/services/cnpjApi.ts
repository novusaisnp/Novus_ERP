
import { CNPJData, CEPData } from '@/types/empresa';

export const consultarCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
  console.log('[CNPJ API]', 'Consultando CNPJ:', cnpj);
  
  try {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos');
    }

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    
    if (!response.ok) {
      throw new Error('CNPJ não encontrado ou inválido');
    }

    const data = await response.json();
    
    console.log('[CNPJ API]', 'Dados retornados:', data);
    
    return {
      cnpj: data.cnpj,
      nome: data.razao_social || data.nome,
      fantasia: data.nome_fantasia,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep, // Incluindo o campo cep no retorno
      situacao: data.situacao_cadastral,
      porte: data.porte
    };
  } catch (error) {
    console.error('[CNPJ API]', 'Erro ao consultar CNPJ:', error);
    return null;
  }
};

export const consultarCEP = async (cep: string): Promise<CEPData | null> => {
  console.log('[CEP API]', 'Consultando CEP:', cep);
  
  try {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }

    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error('CEP não encontrado');
    }

    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }
    
    console.log('[CEP API]', 'Dados retornados:', data);
    
    return {
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      localidade: data.localidade,
      uf: data.uf
    };
  } catch (error) {
    console.error('[CEP API]', 'Erro ao consultar CEP:', error);
    return null;
  }
};

export const validarCNPJ = (cnpj: string): boolean => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  let peso = 5;
  
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  
  let digito1 = soma % 11;
  digito1 = digito1 < 2 ? 0 : 11 - digito1;
  
  if (parseInt(cnpjLimpo[12]) !== digito1) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  peso = 6;
  
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  
  let digito2 = soma % 11;
  digito2 = digito2 < 2 ? 0 : 11 - digito2;
  
  return parseInt(cnpjLimpo[13]) === digito2;
};

export const validarCPF = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i);
  }
  
  let digito1 = 11 - (soma % 11);
  digito1 = digito1 > 9 ? 0 : digito1;
  
  if (parseInt(cpfLimpo[9]) !== digito1) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i);
  }
  
  let digito2 = 11 - (soma % 11);
  digito2 = digito2 > 9 ? 0 : digito2;
  
  return parseInt(cpfLimpo[10]) === digito2;
};

export const formatarCNPJ = (cnpj: string): string => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatarCPF = (cpf: string): string => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatarCEP = (cep: string): string => {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
};
