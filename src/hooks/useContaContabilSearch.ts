
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { planoContasService } from '@/services/planoContasService';
import { PlanoContas } from '@/types/planoContas';
import { useToast } from '@/hooks/use-toast';

export const useContaContabilSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const { toast } = useToast();

  console.log('[ContaContabilSearch] Hook inicializado');

  // Debounce do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      console.log('[ContaContabilSearch] Termo debounced:', searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: contas = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contas-analiticas-search', debouncedSearchTerm],
    queryFn: () => {
      console.log('[ContaContabilSearch] Executando busca com termo:', debouncedSearchTerm, 'tipo: DESPESA');
      return planoContasService.searchContasAnaliticas(debouncedSearchTerm, 'DESPESA');
    },
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  useEffect(() => {
    if (error) {
      console.error('[ContaContabilSearch] Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar as contas contábeis",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleSearchChange = useCallback((value: string) => {
    console.log('[ContaContabilSearch] Termo de busca alterado:', value);
    setSearchTerm(value);
  }, []);

  const shouldShowResults = debouncedSearchTerm.length >= 2;
  const hasResults = contas.length > 0;

  console.log('[ContaContabilSearch] Estado atual:', {
    searchTerm,
    debouncedSearchTerm,
    shouldShowResults,
    hasResults,
    contasCount: contas.length,
    isLoading
  });

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
