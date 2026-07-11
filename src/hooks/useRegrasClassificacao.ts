import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  listarRegras,
  criarRegra,
  atualizarRegra,
  excluirRegra,
} from '@/services/classificacaoReceita/regrasService';
import type { RegraClassificacaoInput } from '@/types/classificacaoReceita';

export const useRegrasClassificacao = () => {
  const { empresaAtual } = useAuth() as any;
  const empresaId: string | undefined = empresaAtual?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['regras-classificacao-receita', empresaId],
    queryFn: () => listarRegras(empresaId as string),
    enabled: !!empresaId,
  });

  const mCriar = useMutation({
    mutationFn: (input: RegraClassificacaoInput) => criarRegra({ ...input, empresa_representada_id: empresaId as string }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regras-classificacao-receita', empresaId] });
      toast({ title: 'Regra criada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar regra', description: e?.message, variant: 'destructive' }),
  });

  const mAtualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RegraClassificacaoInput> }) => atualizarRegra(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regras-classificacao-receita', empresaId] });
      toast({ title: 'Regra atualizada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar regra', description: e?.message, variant: 'destructive' }),
  });

  const mExcluir = useMutation({
    mutationFn: (id: string) => excluirRegra(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regras-classificacao-receita', empresaId] });
      toast({ title: 'Regra removida' });
    },
    onError: (e: any) => toast({ title: 'Erro ao remover', description: e?.message, variant: 'destructive' }),
  });

  return {
    regras: query.data || [],
    isLoading: query.isLoading,
    criar: mCriar.mutateAsync,
    atualizar: mAtualizar.mutateAsync,
    excluir: mExcluir.mutateAsync,
  };
};
