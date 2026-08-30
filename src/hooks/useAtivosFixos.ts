import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ativoFixoService } from '@/services/ativoFixoService';
import { useToast } from '@/hooks/use-toast';
import type { AtivoFixoInput } from '@/types/ativoFixo';

export const useAtivosFixos = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ativosFixos = [], isLoading, error } = useQuery({
    queryKey: ['ativos-fixos'],
    queryFn: ativoFixoService.list,
  });

  const createMutation = useMutation({
    mutationFn: (input: AtivoFixoInput) => ativoFixoService.create(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ativos-fixos'] });
      toast({ title: 'Sucesso', description: `Ativo "${data.nome}" cadastrado com sucesso` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar ativo', description: error.message, variant: 'destructive' });
    },
  });

  const processarDepreciacaoMutation = useMutation({
    mutationFn: () => ativoFixoService.processarDepreciacaoMensal(),
    onSuccess: (itens) => {
      queryClient.invalidateQueries({ queryKey: ['ativos-fixos'] });
      toast({
        title: 'Depreciação processada',
        description: itens.length > 0
          ? `${itens.length} ativo(s) depreciado(s) neste mês`
          : 'Nenhum ativo pendente de depreciação nesta competência',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao processar depreciação', description: error.message, variant: 'destructive' });
    },
  });

  const baixarMutation = useMutation({
    mutationFn: ({ id, dataBaixa, valorBaixa, motivo }: { id: string; dataBaixa: string; valorBaixa: number; motivo: string }) =>
      ativoFixoService.baixar(id, dataBaixa, valorBaixa, motivo),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['ativos-fixos'] });
      const label = resultado.resultado > 0 ? 'ganho' : resultado.resultado < 0 ? 'perda' : 'sem resultado';
      toast({
        title: 'Ativo baixado',
        description: `Baixa registrada — ${label} de R$ ${Math.abs(resultado.resultado).toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao baixar ativo', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ativosFixos,
    isLoading,
    error,
    criar: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    processarDepreciacao: processarDepreciacaoMutation.mutateAsync,
    isProcessandoDepreciacao: processarDepreciacaoMutation.isPending,
    baixar: baixarMutation.mutateAsync,
    isBaixando: baixarMutation.isPending,
  };
};
