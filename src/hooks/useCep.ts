
import { useState } from 'react';

interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export const useCep = () => {
  const [loading, setLoading] = useState(false);

  const fetchCep = async (cep: string): Promise<CepData | null> => {
    if (!cep || cep.length < 8) return null;

    setLoading(true);
    try {
      const cleanCep = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      return {
        cep: data.cep,
        logradouro: data.logradouro,
        complemento: data.complemento || '',
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf
      };
    } catch (error) {
      console.error('[CEP] Erro ao buscar CEP:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchCep, loading };
};
