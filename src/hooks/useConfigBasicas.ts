
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  naturezaCaixasService,
  modalidadeCaixasService,
  planosPagamentoService,
  modalidadeAPIVinculoService
} from '@/services/configBasicasService';
import type {
  NaturezaCaixaInput,
  ModalidadeCaixaInput,
  PlanoPagamentoInput,
  ModalidadeAPIVinculoInput
} from '@/types/configBasicas';


// Hook para Natureza de Caixas
export const useNaturezaCaixas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['natureza-caixas'],
    queryFn: naturezaCaixasService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: naturezaCaixasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['natureza-caixas'] });
      toast({ title: 'Natureza de Caixa criada com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao criar natureza:', error);
      toast({ 
        title: 'Erro ao criar Natureza de Caixa',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NaturezaCaixaInput> }) =>
      naturezaCaixasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['natureza-caixas'] });
      toast({ title: 'Natureza de Caixa atualizada com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao atualizar natureza:', error);
      toast({ 
        title: 'Erro ao atualizar Natureza de Caixa',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: naturezaCaixasService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['natureza-caixas'] });
      toast({ title: 'Natureza de Caixa excluída com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao excluir natureza:', error);
      toast({ 
        title: 'Erro ao excluir Natureza de Caixa',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  return {
    naturezas: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook para Modalidade de Caixas
export const useModalidadeCaixas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: modalidadeCaixasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalidade-caixas'] });
      toast({ title: 'Modalidade de Caixa criada com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao criar modalidade:', error);
      toast({ 
        title: 'Erro ao criar Modalidade de Caixa',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModalidadeCaixaInput> }) =>
      modalidadeCaixasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalidade-caixas'] });
      toast({ title: 'Modalidade de Caixa atualizada com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao atualizar modalidade:', error);
      toast({ 
        title: 'Erro ao atualizar Modalidade de Caixa',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: modalidadeCaixasService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalidade-caixas'] });
      toast({ title: 'Modalidade de Caixa excluída com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao excluir modalidade:', error);
      toast({ 
        title: 'Erro ao excluir Modalidade de Caixa',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook para Planos de Pagamento
export const usePlanosPagamento = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planos-pagamento'],
    queryFn: planosPagamentoService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: planosPagamentoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-pagamento'] });
      toast({ title: 'Plano de Pagamento criado com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao criar plano:', error);
      toast({ 
        title: 'Erro ao criar Plano de Pagamento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlanoPagamentoInput> }) =>
      planosPagamentoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-pagamento'] });
      toast({ title: 'Plano de Pagamento atualizado com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao atualizar plano:', error);
      toast({ 
        title: 'Erro ao atualizar Plano de Pagamento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: planosPagamentoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-pagamento'] });
      toast({ title: 'Plano de Pagamento excluído com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao excluir plano:', error);
      toast({ 
        title: 'Erro ao excluir Plano de Pagamento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  return {
    planos: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook para Modalidade API Vínculo
export const useModalidadeAPIVinculo = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['modalidade-api-vinculo'],
    queryFn: modalidadeAPIVinculoService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: modalidadeAPIVinculoService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalidade-api-vinculo'] });
      toast({ title: 'Modalidade API Vínculo criada com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao criar modalidade API:', error);
      toast({ 
        title: 'Erro ao criar Modalidade API Vínculo',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ModalidadeAPIVinculoInput> }) =>
      modalidadeAPIVinculoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalidade-api-vinculo'] });
      toast({ title: 'Modalidade API Vínculo atualizada com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao atualizar modalidade API:', error);
      toast({ 
        title: 'Erro ao atualizar Modalidade API Vínculo',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: modalidadeAPIVinculoService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalidade-api-vinculo'] });
      toast({ title: 'Modalidade API Vínculo excluída com sucesso!' });
    },
    onError: (error) => {
      console.error('[useConfigBasicas] Erro ao excluir modalidade API:', error);
      toast({ 
        title: 'Erro ao excluir Modalidade API Vínculo',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive'
      });
    },
  });

  return {
    modalidades: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
