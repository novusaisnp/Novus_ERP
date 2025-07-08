
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchConfiguracoesFiscais, 
  fetchNaturezasOperacao, 
  fetchCFOPs, 
  fetchTributos, 
  fetchNCMs,
  createConfiguracaoFiscal
} from "@/services/fiscalService";
import { toast } from "sonner";

console.log('[Fiscal] Inicializando hooks fiscais');

export const useConfiguracoesFiscais = () => {
  return useQuery({
    queryKey: ['configuracoes-fiscais'],
    queryFn: fetchConfiguracoesFiscais,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useNaturezasOperacao = () => {
  return useQuery({
    queryKey: ['naturezas-operacao'],
    queryFn: fetchNaturezasOperacao,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useCFOPs = () => {
  return useQuery({
    queryKey: ['cfops'],
    queryFn: fetchCFOPs,
    staleTime: 15 * 60 * 1000, // 15 minutos
  });
};

export const useTributos = () => {
  return useQuery({
    queryKey: ['tributos'],
    queryFn: fetchTributos,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useNCMs = () => {
  return useQuery({
    queryKey: ['ncms'],
    queryFn: fetchNCMs,
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
};

export const useCreateConfiguracaoFiscal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createConfiguracaoFiscal,
    onSuccess: () => {
      console.log('[Fiscal] Configuração fiscal criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['configuracoes-fiscais'] });
      toast.success('Configuração fiscal salva com sucesso!');
    },
    onError: (error) => {
      console.error('[Fiscal] Erro ao criar configuração fiscal:', error);
      toast.error('Erro ao salvar configuração fiscal');
    },
  });
};
