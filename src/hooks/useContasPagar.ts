
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { contasPagarService } from '@/services/contasPagarService';
import type { ContaPagar, ContaPagarInput, ContaPagarFilters } from '@/types/contasPagar';

export const useContasPagar = (filtros: ContaPagarFilters = {}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: contasPagar = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contas-pagar', filtros],
    queryFn: () => contasPagarService.getAll(filtros),
  });

  const {
    data: estatisticas,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['contas-pagar-stats', filtros],
    queryFn: () => contasPagarService.getEstatisticas(filtros),
  });

  const createMutation = useMutation({
    mutationFn: contasPagarService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-stats'] });
      toast({
        title: 'Sucesso',
        description: 'Conta a pagar criada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[UseContasPagar] Erro ao criar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar conta a pagar',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContaPagarInput }) =>
      contasPagarService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-stats'] });
      toast({
        title: 'Sucesso',
        description: 'Conta a pagar atualizada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[UseContasPagar] Erro ao atualizar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar conta a pagar',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contasPagarService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-stats'] });
      toast({
        title: 'Sucesso',
        description: 'Conta a pagar removida com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[UseContasPagar] Erro ao remover:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover conta a pagar',
        variant: 'destructive',
      });
    },
  });

  return {
    contasPagar,
    estatisticas,
    isLoading,
    isLoadingStats,
    error,
    criar: createMutation.mutate,
    atualizar: updateMutation.mutate,
    remover: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useContaPagar = (id: string) => {
  const { toast } = useToast();

  const {
    data: conta,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conta-pagar', id],
    queryFn: () => contasPagarService.getById(id),
    enabled: !!id,
  });

  return {
    conta,
    isLoading,
    error,
  };
};
