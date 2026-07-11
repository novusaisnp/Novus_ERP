// FIN-E1: hooks React Query para os catálogos globais de pagamento.
import { useQuery } from '@tanstack/react-query';
import { pagamentoCatalogoService } from '@/services/pagamentoCatalogoService';

export const usePagamentoModalidades = (apenasAtivos = true) =>
  useQuery({
    queryKey: ['pagamento', 'modalidades', { apenasAtivos }],
    queryFn: () => pagamentoCatalogoService.listarModalidades(apenasAtivos),
    staleTime: 5 * 60 * 1000,
  });

export const usePagamentoNaturezas = (apenasAtivos = true) =>
  useQuery({
    queryKey: ['pagamento', 'naturezas', { apenasAtivos }],
    queryFn: () => pagamentoCatalogoService.listarNaturezas(apenasAtivos),
    staleTime: 5 * 60 * 1000,
  });
