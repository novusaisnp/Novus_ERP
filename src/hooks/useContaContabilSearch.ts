
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planoContasService } from '@/services/planoContasService';
import { PlanoContas } from '@/types/planoContas';
import { useToast } from '@/hooks/use-toast';

export const useContaContabilSearch = (tipo: 'RECEITA' | 'DESPESA' = 'DESPESA') => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: contas = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contas-analiticas-search', tipo, debouncedSearchTerm],
    queryFn: () => planoContasService.searchContasAnaliticas(debouncedSearchTerm, tipo),
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (error) {
      console.error('[ContaContabilSearch] Erro na busca:', error);
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar as contas contábeis',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleSearchChange = useCallback((value: string) => setSearchTerm(value), []);

  const shouldShowResults = debouncedSearchTerm.length >= 2;
  const hasResults = contas.length > 0;

  return {
    searchTerm,
    contas,
    isLoading,
    error,
    shouldShowResults,
    hasResults,
    handleSearchChange,
  };
};

