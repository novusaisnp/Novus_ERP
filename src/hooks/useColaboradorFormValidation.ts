
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface FormData {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  telefone?: string;
  emailPessoal?: string;
  empresaRepresentadaId: string;
}

export const useColaboradorFormValidation = (form: UseFormReturn<any>) => {
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const subscription = form.watch((values) => {
      console.log('[FormColaborador] Validando campos essenciais:', values);
      
      const isValid = validateEssentialFields(values);
      setIsFormValid(isValid);
      
      console.log('[FormColaborador] Formulário válido:', isValid);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const validateEssentialFields = (values: any): boolean => {
    // Nome Completo (mínimo 3 caracteres)
    if (!values.nomeCompleto || values.nomeCompleto.trim().length < 3) {
      console.log('[FormColaborador] Nome completo inválido:', values.nomeCompleto);
      return false;
    }

    // CPF (mínimo 11 caracteres - validação básica)
    if (!values.cpf || values.cpf.replace(/\D/g, '').length < 11) {
      console.log('[FormColaborador] CPF inválido:', values.cpf);
      return false;
    }

    // Data de Nascimento
    if (!values.dataNascimento || values.dataNascimento.trim() === '') {
      console.log('[FormColaborador] Data de nascimento obrigatória');
      return false;
    }

    // Endereço Completo - todos os campos obrigatórios
    const endereco = values.endereco || {};
    const camposEnderecoObrigatorios = ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'];
    const enderecoCompleto = camposEnderecoObrigatorios.every(campo => {
      const valor = endereco[campo];
      return valor && valor.trim() !== '';
    });
    
    if (!enderecoCompleto) {
      console.log('[FormColaborador] Endereço incompleto:', endereco);
      const camposFaltantes = camposEnderecoObrigatorios.filter(campo => !endereco[campo] || endereco[campo].trim() === '');
      console.log('[FormColaborador] Campos de endereço faltantes:', camposFaltantes);
      return false;
    }

    // Pelo menos um contato (telefone OU email)
    const temTelefone = values.telefone && values.telefone.trim() !== '';
    const temEmail = values.emailPessoal && values.emailPessoal.trim() !== '';
    
    if (!temTelefone && !temEmail) {
      console.log('[FormColaborador] Nenhum contato fornecido - telefone:', temTelefone, 'email:', temEmail);
      return false;
    }

    // Empresa Representada
    if (!values.empresaRepresentadaId || values.empresaRepresentadaId.trim() === '') {
      console.log('[FormColaborador] Empresa representada obrigatória');
      return false;
    }

    console.log('[FormColaborador] Todos os campos essenciais válidos');
    console.log('[FormColaborador] Validação:', {
      nomeCompleto: !!values.nomeCompleto && values.nomeCompleto.trim().length >= 3,
      cpf: !!values.cpf && values.cpf.replace(/\D/g, '').length >= 11,
      dataNascimento: !!values.dataNascimento,
      enderecoCompleto,
      contato: temTelefone || temEmail,
      empresaRepresentada: !!values.empresaRepresentadaId
    });
    
    return true;
  };

  return { isFormValid, validateEssentialFields };
};
