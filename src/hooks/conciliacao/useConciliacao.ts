// P15.2 — Hooks TanStack Query da Conciliação Bancária
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conciliacaoService } from "@/services/conciliacao/conciliacaoService";
import { toast } from "@/hooks/use-toast";
import type { RegraConciliacaoInput } from "@/types/conciliacao";

export function useExtratos() {
  return useQuery({
    queryKey: ["conciliacao", "extratos"],
    queryFn: () => conciliacaoService.listarExtratos(),
    staleTime: 30_000,
  });
}

export function useExtrato(id: string | undefined) {
  return useQuery({
    queryKey: ["conciliacao", "extrato", id],
    queryFn: () => conciliacaoService.obterExtrato(id!),
    enabled: !!id,
  });
}

export function useLinhasExtrato(extratoId: string | undefined) {
  return useQuery({
    queryKey: ["conciliacao", "linhas", extratoId],
    queryFn: () => conciliacaoService.listarLinhas(extratoId!),
    enabled: !!extratoId,
    staleTime: 15_000,
  });
}

export function useRegrasConciliacao() {
  return useQuery({
    queryKey: ["conciliacao", "regras"],
    queryFn: () => conciliacaoService.listarRegras(),
    staleTime: 60_000,
  });
}

export function useImportarExtrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { file: File; contaBancariaId: string }) =>
      conciliacaoService.importarExtrato(params.file, params.contaBancariaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "extratos"] });
      toast({ title: "Extrato importado", description: "Match automático executado." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" }),
  });
}

export function useSugerirMatches(extratoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => conciliacaoService.sugerirMatches(extratoId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "linhas", extratoId] });
      qc.invalidateQueries({ queryKey: ["conciliacao", "extrato", extratoId] });
    },
    onError: (e: Error) =>
      toast({ title: "Erro no match", description: e.message, variant: "destructive" }),
  });
}

export function useConfirmarMatch(extratoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { linhaId: string; movimentacaoId: string }) =>
      conciliacaoService.confirmarMatch(params.linhaId, params.movimentacaoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "linhas", extratoId] });
      toast({ title: "Conciliação confirmada" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao confirmar", description: e.message, variant: "destructive" }),
  });
}

export function useDesfazerConciliacao(extratoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linhaId: string) => conciliacaoService.desfazerConciliacao(linhaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "linhas", extratoId] });
      toast({ title: "Conciliação desfeita" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao desfazer", description: e.message, variant: "destructive" }),
  });
}

export function useReverterExtrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (extratoId: string) => conciliacaoService.reverterExtrato(extratoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "extratos"] });
      toast({ title: "Extrato revertido" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao reverter", description: e.message, variant: "destructive" }),
  });
}

export function useCandidatosMatch(params: {
  contaBancariaId: string | undefined;
  valor: number | undefined;
  dataMovimento: string | undefined;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "conciliacao",
      "candidatos",
      params.contaBancariaId,
      params.valor,
      params.dataMovimento,
    ],
    queryFn: () =>
      conciliacaoService.listarCandidatosMovimentacao({
        contaBancariaId: params.contaBancariaId!,
        valor: params.valor!,
        dataMovimento: params.dataMovimento!,
      }),
    enabled: params.enabled && !!params.contaBancariaId && !!params.dataMovimento,
    staleTime: 15_000,
  });
}

export function useCriarRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegraConciliacaoInput) => conciliacaoService.criarRegra(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "regras"] });
      toast({ title: "Regra criada" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao criar regra", description: e.message, variant: "destructive" }),
  });
}

export function useAtualizarRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; input: Partial<RegraConciliacaoInput> }) =>
      conciliacaoService.atualizarRegra(params.id, params.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "regras"] });
      toast({ title: "Regra atualizada" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });
}

export function useExcluirRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conciliacaoService.excluirRegra(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conciliacao", "regras"] });
      toast({ title: "Regra excluída" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });
}

export function useLookupNaturezas() {
  return useQuery({
    queryKey: ["conciliacao", "lookup", "naturezas"],
    queryFn: () => conciliacaoService.listarNaturezasReceita(),
    staleTime: 5 * 60_000,
  });
}

export function useLookupPlanoContas() {
  return useQuery({
    queryKey: ["conciliacao", "lookup", "plano-contas"],
    queryFn: () => conciliacaoService.listarPlanoContas(),
    staleTime: 5 * 60_000,
  });
}

export function useLookupCentrosCusto() {
  return useQuery({
    queryKey: ["conciliacao", "lookup", "centros-custo"],
    queryFn: () => conciliacaoService.listarCentrosCusto(),
    staleTime: 5 * 60_000,
  });
}
