import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { solicitacoesAprovacaoService } from '@/services/alcadasService';
import { usuarioService } from '@/services/usuarioService';
import { useToast } from '@/hooks/use-toast';
import type { SolicitarAprovacaoInput } from '@/types/alcadas';

export const useSolicitacoesAprovacao = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: solicitacoes = [], isLoading, error } = useQuery({
    queryKey: ['solicitacoes-aprovacao'],
    queryFn: solicitacoesAprovacaoService.list,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-ativos'],
    queryFn: usuarioService.fetchUsuariosAtivos,
    staleTime: 5 * 60 * 1000,
  });

  const nomesPorUserId = new Map(usuarios.map((u) => [u.user_id, u.nome]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['solicitacoes-aprovacao'] });

  const solicitarMutation = useMutation({
    mutationFn: (input: SolicitarAprovacaoInput) => solicitacoesAprovacaoService.solicitar(input),
    onSuccess: (resultado) => {
      invalidate();
      toast({
        title: resultado.status === 'AUTO_APROVADO' ? 'Aprovado automaticamente' : 'Solicitação enviada',
        description: resultado.status === 'AUTO_APROVADO'
          ? 'Sem alçada configurada para esta categoria/valor — nenhuma aprovação exigida.'
          : 'Aguardando decisão de um aprovador com a alçada necessária.',
      });
    },
    onError: (error: Error) => toast({ title: 'Erro ao solicitar aprovação', description: error.message, variant: 'destructive' }),
  });

  const decidirMutation = useMutation({
    mutationFn: ({ id, decisao, justificativa }: { id: string; decisao: 'APROVADO' | 'REJEITADO'; justificativa?: string }) =>
      solicitacoesAprovacaoService.decidir(id, decisao, justificativa),
    onSuccess: (resultado) => {
      invalidate();
      toast({ title: resultado.status === 'APROVADO' ? 'Solicitação aprovada' : 'Solicitação rejeitada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao decidir solicitação', description: error.message, variant: 'destructive' }),
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => solicitacoesAprovacaoService.cancelar(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Solicitação cancelada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao cancelar solicitação', description: error.message, variant: 'destructive' }),
  });

  return {
    solicitacoes,
    isLoading,
    error,
    nomesPorUserId,
    solicitar: solicitarMutation.mutateAsync,
    isSolicitando: solicitarMutation.isPending,
    decidir: decidirMutation.mutateAsync,
    isDecidindo: decidirMutation.isPending,
    cancelar: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
  };
};
