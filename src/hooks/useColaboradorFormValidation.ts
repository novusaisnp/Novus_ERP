
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

// form.watch() entrega um deep-partial (RHF não tipa o callback como Partial<T> simples,
// os campos aninhados de endereco também ficam opcionais enquanto o usuário digita).
type WatchedFormData = Partial<Omit<FormData, 'endereco'>> & {
  endereco?: Partial<FormData['endereco']>;
};

export const useColaboradorFormValidation = (form: UseFormReturn<FormData>) => {
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    const subscription = form.watch((values) => {

      const isValid = validateEssentialFields(values);
      setIsFormValid(isValid);

    });

    return () => subscription.unsubscribe();
  }, [form]);

  const validateEssentialFields = (values: WatchedFormData): boolean => {
    // Nome Completo (mínimo 3 caracteres)
    if (!values.nomeCompleto || values.nomeCompleto.trim().length < 3) {
      return false;
    }

    // CPF (mínimo 11 caracteres - validação básica)
    if (!values.cpf || values.cpf.replace(/\D/g, '').length < 11) {
      return false;
    }

    // Data de Nascimento
    if (!values.dataNascimento || values.dataNascimento.trim() === '') {
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
      const camposFaltantes = camposEnderecoObrigatorios.filter(campo => !endereco[campo] || endereco[campo].trim() === '');
      return false;
    }

    // Pelo menos um contato (telefone OU email)
    const temTelefone = values.telefone && values.telefone.trim() !== '';
    const temEmail = values.emailPessoal && values.emailPessoal.trim() !== '';
    
    if (!temTelefone && !temEmail) {
      return false;
    }

    // Empresa Representada
    if (!values.empresaRepresentadaId || values.empresaRepresentadaId.trim() === '') {
      return false;
    }

    return true;
  };

  return { isFormValid, validateEssentialFields };
};
