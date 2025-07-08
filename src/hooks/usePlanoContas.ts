
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planoContasService } from '@/services/planoContasService';
import { PlanoContas, PlanoContasInput } from '@/types/planoContas';
import { useToast } from '@/hooks/use-toast';

export const usePlanoContas = () => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  console.log('[PlanoContas] Hook inicializado');

  const {
    data: contas = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['plano-contas'],
    queryFn: planoContasService.getAll,
  });

  const contasHierarquicas = planoContasService.buildTree(contas);

  const createMutation = useMutation({
    mutationFn: planoContasService.create,
    onSuccess: (data) => {
      console.log('[PlanoContas] Conta criada com sucesso:', data);
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
      
      // Expandir o nó pai automaticamente se existe
      if (data.id_pai) {
        setExpandedNodes(prev => new Set([...prev, data.id_pai!]));
      }

      toast({
        title: "Sucesso",
        description: `Conta "${data.nome}" criada com sucesso`,
      });
    },
    onError: (error: Error) => {
      console.error('[PlanoContas] Erro ao criar conta:', error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Erro interno do sistema",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlanoContasInput> }) =>
      planoContasService.update(id, data),
    onSuccess: (data) => {
      console.log('[PlanoContas] Conta atualizada com sucesso:', data);
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
      toast({
        title: "Sucesso",
        description: `Conta "${data.nome}" atualizada com sucesso`,
      });
    },
    onError: (error: Error) => {
      console.error('[PlanoContas] Erro ao atualizar conta:', error);
      toast({
        title: "Erro ao atualizar conta",
        description: error.message || "Erro interno do sistema",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: planoContasService.delete,
    onSuccess: () => {
      console.log('[PlanoContas] Conta excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['plano-contas'] });
      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso",
      });
    },
    onError: (error: Error) => {
      console.error('[PlanoContas] Erro ao excluir conta:', error);
      toast({
        title: "Erro ao excluir conta",
        description: error.message || "Erro interno do sistema",
        variant: "destructive",
      });
    },
  });

  const toggleExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(contas.map(conta => conta.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return {
    contas,
    contasHierarquicas,
    isLoading,
    error,
    expandedNodes,
    createConta: createMutation.mutateAsync, // Usar mutateAsync para aguardar o resultado
    updateConta: updateMutation.mutateAsync, // Usar mutateAsync para aguardar o resultado
    deleteConta: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    toggleExpansion,
    expandAll,
    collapseAll,
  };
};
