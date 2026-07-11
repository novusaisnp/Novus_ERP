import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchOrcamentos,
  createOrcamento,
  updateOrcamento,
  updateOrcamentoStatus,
  softDeleteOrcamento,
  OrcamentoInput,
  OrcamentoStatus,
} from '@/services/orcamentosService';

const KEY = ['orcamentos'];

const mapErr = (err: unknown): string => {
  const e = err as { message?: string; code?: string };
  const msg = String(e?.message ?? '');
  if (e?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Sem permissão para esta operação.';
  }
  if (e?.code === '23505' || /duplicate key/i.test(msg)) {
    return 'Já existe um orçamento com esse número para esta empresa.';
  }
  if (e?.code === '23514' || /check constraint/i.test(msg)) {
    return 'Valor inválido para o campo.';
  }
  if (e?.code === '23503') {
    return 'Cliente ou empresa não encontrada.';
  }
  return msg || 'Falha na operação.';
};

export const useOrcamentos = () =>
  useQuery({ queryKey: KEY, queryFn: fetchOrcamentos, staleTime: 60_000 });

export const useCreateOrcamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrcamentoInput) => createOrcamento(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (err) => toast.error(mapErr(err)),
  });
};

export const useUpdateOrcamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<OrcamentoInput> }) =>
      updateOrcamento(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Orçamento atualizado!');
    },
    onError: (err) => toast.error(mapErr(err)),
  });
};

export const useUpdateOrcamentoStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrcamentoStatus }) =>
      updateOrcamentoStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Status atualizado!');
    },
    onError: (err) => toast.error(mapErr(err)),
  });
};

export const useDeleteOrcamento = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteOrcamento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Orçamento removido.');
    },
    onError: (err) => toast.error(mapErr(err)),
  });
};
