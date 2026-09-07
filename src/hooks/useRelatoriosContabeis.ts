import { useQuery } from '@tanstack/react-query';
import { relatorioContabilService } from '@/services/relatorioContabilService';
import { useEmpresaRepresentadaAtual } from '@/hooks/useEmpresaRepresentadaAtual';

export const useBalancoPatrimonial = (dataCorte: string) => {
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const empresaId = empresa?.id;

  const query = useQuery({
    queryKey: ['balanco-patrimonial', empresaId, dataCorte],
    queryFn: () => relatorioContabilService.balancoPatrimonial(empresaId as string, dataCorte),
    enabled: !!empresaId && !!dataCorte,
  });

  return { linhas: query.data ?? [], isLoading: query.isLoading, error: query.error };
};

export const useDre = (dataInicio: string, dataFim: string) => {
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const empresaId = empresa?.id;

  const dreQuery = useQuery({
    queryKey: ['dre', empresaId, dataInicio, dataFim],
    queryFn: () => relatorioContabilService.dre(empresaId as string, dataInicio, dataFim),
    enabled: !!empresaId && !!dataInicio && !!dataFim,
  });

  const contaDepreciacaoQuery = useQuery({
    queryKey: ['conta-depreciacao-default', empresaId],
    queryFn: () => relatorioContabilService.contaDepreciacaoDefault(empresaId as string),
    enabled: !!empresaId,
  });

  const linhas = dreQuery.data ?? [];
  const totalReceita = linhas.filter((l) => l.tipo === 'RECEITA').reduce((acc, l) => acc + l.valorPeriodo, 0);
  const totalDespesa = linhas.filter((l) => l.tipo === 'DESPESA').reduce((acc, l) => acc + l.valorPeriodo, 0);
  const resultado = totalReceita - totalDespesa;
  const depreciacaoPeriodo = contaDepreciacaoQuery.data
    ? linhas.find((l) => l.contaId === contaDepreciacaoQuery.data)?.valorPeriodo ?? 0
    : 0;
  const ebitda = resultado + depreciacaoPeriodo;

  return {
    linhas,
    totalReceita,
    totalDespesa,
    resultado,
    depreciacaoPeriodo,
    ebitda,
    isLoading: dreQuery.isLoading || contaDepreciacaoQuery.isLoading,
    error: dreQuery.error,
  };
};

export const useDmpl = (dataInicio: string, dataFim: string) => {
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const empresaId = empresa?.id;

  const query = useQuery({
    queryKey: ['dmpl', empresaId, dataInicio, dataFim],
    queryFn: () => relatorioContabilService.dmpl(empresaId as string, dataInicio, dataFim),
    enabled: !!empresaId && !!dataInicio && !!dataFim,
  });

  const linhas = query.data ?? [];
  const totalSaldoInicial = linhas.reduce((acc, l) => acc + l.saldoInicial, 0);
  const totalMovimento = linhas.reduce((acc, l) => acc + l.movimentoPeriodo, 0);
  const totalSaldoFinal = linhas.reduce((acc, l) => acc + l.saldoFinal, 0);

  return {
    linhas,
    totalSaldoInicial,
    totalMovimento,
    totalSaldoFinal,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useDfc = (dataInicio: string, dataFim: string) => {
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const empresaId = empresa?.id;

  const query = useQuery({
    queryKey: ['dfc', empresaId, dataInicio, dataFim],
    queryFn: () => relatorioContabilService.dfc(empresaId as string, dataInicio, dataFim),
    enabled: !!empresaId && !!dataInicio && !!dataFim,
  });

  return {
    dfc: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
