// P12: Hooks React Query para Estoque
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { estoqueService, type NovaMovimentacaoInput } from '@/services/estoque/estoqueService';
import type { EstoqueMovimentacaoTipo } from '@/types/estoque';

export function useMovimentacoes(filtros?: {
  empresa_id?: string;
  produto_id?: string;
  tipo?: EstoqueMovimentacaoTipo;
}) {
  return useQuery({
    queryKey: ['estoque', 'movimentacoes', filtros],
    queryFn: () => estoqueService.listMovimentacoes(filtros as { empresa_id: string; produto_id?: string; tipo?: EstoqueMovimentacaoTipo }),
    enabled: !!filtros?.empresa_id,
    staleTime: 30_000,
  });
}

export function useSaldos(empresa_id: string | undefined) {
  return useQuery({
    queryKey: ['estoque', 'saldos', empresa_id],
    queryFn: () => estoqueService.listSaldos(empresa_id as string),
    enabled: !!empresa_id,
    staleTime: 15_000,
  });
}

export function useCriarMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NovaMovimentacaoInput) => estoqueService.criarMovimentacao(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] });
    },
  });
}

export function useInventarios(empresa_id: string | undefined) {
  return useQuery({
    queryKey: ['estoque', 'inventarios', empresa_id],
    queryFn: () => estoqueService.listInventarios(empresa_id as string),
    enabled: !!empresa_id,
    staleTime: 30_000,
  });
}

export function useInventarioItens(inventario_id: string | undefined) {
  return useQuery({
    queryKey: ['estoque', 'inventario-itens', inventario_id],
    queryFn: () => estoqueService.listInventarioItens(inventario_id as string),
    enabled: !!inventario_id,
  });
}

export function useCriarInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: estoqueService.criarInventario,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estoque', 'inventarios'] }),
  });
}

export function useConciliarInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inventario_id: string) => estoqueService.conciliarInventario(inventario_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estoque'] }),
  });
}
