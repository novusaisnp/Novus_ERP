
import { useState, useEffect, useCallback } from 'react';
import type { ContaPagar, ContaPagarInput, RateioContaPagar } from '@/types/contasPagar';

interface UseContasPagarFormProps {
  conta?: ContaPagar;
  isOpen: boolean;
}

export const useContasPagarForm = ({ conta, isOpen }: UseContasPagarFormProps) => {
  console.log('[ContasPagarForm] Hook inicializado', { conta: conta?.id, isOpen });

  const [formData, setFormData] = useState<ContaPagarInput>({
    numero_documento: '',
    descricao: '',
    valor_original: 0,
    valor_atual: 0,
    data_vencimento: '',
    data_emissao: '',
    situacao: 'ABERTA',
    recorrente: false,
    ativo: true,
    rateios: [],
  });

  const [useRateio, setUseRateio] = useState(false);

  useEffect(() => {
    console.log('[ContasPagarForm] Reinicializando formulário', { conta: conta?.id, isOpen });
    
    if (conta) {
      console.log('[ContasPagarForm] Dados da conta para edição:', {
        id: conta.id,
        rateios: conta.rateios,
        rateiosLength: conta.rateios?.length || 0
      });

      setFormData({
        numero_documento: conta.numero_documento,
        descricao: conta.descricao,
        fornecedor_id: conta.fornecedor_id,
        plano_conta_id: conta.plano_conta_id,
        centro_custo_id: conta.centro_custo_id,
        valor_original: conta.valor_original,
        valor_atual: conta.valor_atual,
        data_vencimento: conta.data_vencimento,
        data_emissao: conta.data_emissao,
        data_competencia: conta.data_competencia,
        situacao: conta.situacao,
        observacoes: conta.observacoes,
        periodicidade: conta.periodicidade,
        recorrente: conta.recorrente,
        numero_parcela: conta.numero_parcela,
        total_parcelas: conta.total_parcelas,
        ativo: conta.ativo,
        rateios: conta.rateios || [],
      });
      
      // Verificar se tem rateios para definir o estado do useRateio
      const temRateios = conta.rateios && conta.rateios.length > 0;
      console.log('[ContasPagarForm] Definindo useRateio:', temRateios);
      setUseRateio(temRateios);
    } else {
      setFormData({
        numero_documento: '',
        descricao: '',
        valor_original: 0,
        valor_atual: 0,
        data_vencimento: '',
        data_emissao: new Date().toISOString().split('T')[0],
        situacao: 'ABERTA',
        recorrente: false,
        ativo: true,
        rateios: [],
      });
      setUseRateio(false);
    }
  }, [conta, isOpen]);

  const handleInputChange = useCallback((field: keyof ContaPagarInput, value: any) => {
    console.log('[ContasPagarForm] Atualizando campo:', field, value);

    setFormData(prev => {
      const newData: ContaPagarInput = { ...prev, [field]: value };

      // Sincronizar valor_atual com valor_original se não foi editado manualmente
      if (field === 'valor_original' && prev.valor_atual === prev.valor_original) {
        newData.valor_atual = value;
      }

      // Recalcular rateios quando valor_atual (ou valor_original em sync) mudar
      const novoValorTotal = newData.valor_atual;
      const totalMudou = field === 'valor_atual' || field === 'valor_original';
      if (totalMudou && prev.rateios && prev.rateios.length > 0 && novoValorTotal > 0) {
        const round2 = (n: number) => Math.round(n * 100) / 100;
        const rateiosRecalculados = prev.rateios.map((r) => {
          const percentual = r.percentual || 0;
          const valorNovo = round2((novoValorTotal * percentual) / 100);
          return { ...r, valor: valorNovo };
        });
        // Ajustar arredondamento no último rateio para bater exatamente o total
        const somaParcial = rateiosRecalculados
          .slice(0, -1)
          .reduce((s, r) => s + (r.valor || 0), 0);
        const idxLast = rateiosRecalculados.length - 1;
        rateiosRecalculados[idxLast] = {
          ...rateiosRecalculados[idxLast],
          valor: round2(novoValorTotal - somaParcial),
        };
        newData.rateios = rateiosRecalculados;
      }

      return newData;
    });
  }, []);

  const handleRateiosChange = useCallback((rateios: RateioContaPagar[]) => {
    console.log('[ContasPagarForm] Atualizando rateios:', rateios.length);
    
    setFormData(prev => ({
      ...prev,
      rateios,
    }));
  }, []);

  const prepareSubmitData = useCallback(() => {
    console.log('[ContasPagarForm] Preparando dados para envio', { 
      useRateio, 
      rateiosCount: formData.rateios?.length,
      rateios: formData.rateios 
    });
    
    // Validações básicas obrigatórias
    if (!formData.numero_documento?.trim()) {
      throw new Error('Número do documento é obrigatório');
    }
    
    if (!formData.descricao?.trim()) {
      throw new Error('Descrição é obrigatória');
    }
    
    if (!formData.valor_original || formData.valor_original <= 0) {
      throw new Error('Valor original deve ser maior que zero');
    }
    
    if (!formData.valor_atual || formData.valor_atual <= 0) {
      throw new Error('Valor atual deve ser maior que zero');
    }
    
    if (!formData.data_vencimento) {
      throw new Error('Data de vencimento é obrigatória');
    }
    
    if (!formData.data_emissao) {
      throw new Error('Data de emissão é obrigatória');
    }
    
    const dataToSubmit = { ...formData };
    
    if (useRateio && dataToSubmit.rateios && dataToSubmit.rateios.length > 0) {
      console.log('[ContasPagarForm] Processando rateios:', dataToSubmit.rateios);
      
      // Quando usar rateio, limpar conta e centro de custo únicos
      dataToSubmit.plano_conta_id = undefined;
      dataToSubmit.centro_custo_id = undefined;
      
      // Validar se todas as contas foram selecionadas
      const rateiosSemConta = dataToSubmit.rateios.filter(r => !r.plano_conta_id);
      if (rateiosSemConta.length > 0) {
        throw new Error('Todos os rateios devem ter uma conta contábil analítica selecionada');
      }
      
      // Validar se todos os valores são válidos
      const rateiosComValorInvalido = dataToSubmit.rateios.filter(r => !r.valor || r.valor <= 0);
      if (rateiosComValorInvalido.length > 0) {
        throw new Error('Todos os rateios devem ter valores maiores que zero');
      }
      
      // Validar se o total dos valores dos rateios bate com o valor da conta
      const totalValorRateios = dataToSubmit.rateios.reduce((total, r) => total + (r.valor || 0), 0);
      if (Math.abs(totalValorRateios - dataToSubmit.valor_atual) > 0.01) {
        throw new Error('A soma dos valores dos rateios deve ser igual ao valor da conta');
      }
      
      // Calcular e validar percentuais automaticamente
      dataToSubmit.rateios = dataToSubmit.rateios.map(rateio => ({
        ...rateio,
        percentual: Math.round((rateio.valor / dataToSubmit.valor_atual) * 100 * 100) / 100 // Arredondar para 2 casas decimais
      }));
      
    } else {
      // Quando não usar rateio, limpar array de rateios
      dataToSubmit.rateios = [];
      
      // Validar se conta única foi selecionada
      if (!dataToSubmit.plano_conta_id) {
        throw new Error('É necessário selecionar uma conta contábil ou configurar rateios');
      }
    }
    
    console.log('[ContasPagarForm] Dados validados e preparados para envio:', dataToSubmit);
    return dataToSubmit;
  }, [formData, useRateio]);

  return {
    formData,
    useRateio,
    setUseRateio,
    handleInputChange,
    handleRateiosChange,
    prepareSubmitData,
  };
};
