
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchConfiguracoesFiscais, 
  fetchNaturezasOperacao, 
  fetchCFOPs, 
  fetchTributos, 
  fetchNCMs,
  createConfiguracaoFiscal,
  createCFOP,
  updateCFOP,
  toggleCFOPAtivo,
  CFOPInput,
  createNCM,
  updateNCM,
  toggleNCMAtivo,
  NCMInput,
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

type ApiError = { message?: string; error_description?: string; code?: string };

// ===== CFOP mutations (admin only via RLS) =====
const mapCFOPError = (err: ApiError): string => {
  const msg = String(err?.message || err?.error_description || '');
  const code = err?.code;
  if (code === '42501' || /permission denied|violates row-level security/i.test(msg)) {
    return 'Sem permissão: apenas administradores podem alterar CFOPs.';
  }
  if (code === '23505' || /duplicate key/i.test(msg)) {
    return 'Já existe um CFOP com esse código.';
  }
  if (code === '23514' || /check constraint/i.test(msg)) {
    return 'Código CFOP inválido: deve ter 4 dígitos numéricos.';
  }
  return msg || 'Falha ao processar CFOP.';
};

export const useCreateCFOP = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CFOPInput) => createCFOP(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cfops'] });
      toast.success('CFOP criado com sucesso!');
    },
    onError: (err) => toast.error(mapCFOPError(err)),
  });
};

export const useUpdateCFOP = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CFOPInput> }) => updateCFOP(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cfops'] });
      toast.success('CFOP atualizado!');
    },
    onError: (err) => toast.error(mapCFOPError(err)),
  });
};

export const useToggleCFOPAtivo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => toggleCFOPAtivo(id, ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cfops'] }),
    onError: (err) => toast.error(mapCFOPError(err)),
  });
};

// ===== NCM mutations (admin only via RLS) =====
const mapNCMError = (err: ApiError): string => {
  const msg = String(err?.message || err?.error_description || '');
  const code = err?.code;
  if (code === '42501' || /permission denied|violates row-level security/i.test(msg)) {
    return 'Sem permissão: apenas administradores podem alterar NCMs.';
  }
  if (code === '23505' || /duplicate key/i.test(msg)) {
    return 'Já existe um NCM com esse código.';
  }
  if (code === '23514' || /check constraint/i.test(msg)) {
    return 'Código NCM inválido: deve ter 8 dígitos numéricos.';
  }
  return msg || 'Falha ao processar NCM.';
};

export const useCreateNCM = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NCMInput) => createNCM(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ncms'] });
      toast.success('NCM criado com sucesso!');
    },
    onError: (err) => toast.error(mapNCMError(err)),
  });
};

export const useUpdateNCM = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NCMInput> }) => updateNCM(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ncms'] });
      toast.success('NCM atualizado!');
    },
    onError: (err) => toast.error(mapNCMError(err)),
  });
};

export const useToggleNCMAtivo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => toggleNCMAtivo(id, ativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ncms'] }),
    onError: (err) => toast.error(mapNCMError(err)),
  });
};
