import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogoProduto {
  id: string;
  codigo: string | null;
  nome: string;
  preco: number;
  estoque: number;
  controlaEstoque: boolean;
}

export interface CatalogoServico {
  id: string;
  codigo: string | null;
  nome: string;
  preco: number;
}

export const useCatalogoProdutos = (empresaId?: string) =>
  useQuery({
    queryKey: ['catalogo-produtos', empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<CatalogoProduto[]> => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, codigo, nome, preco_venda, estoque_atual, controla_estoque')
        .eq('empresa_representada_id', empresaId!)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome')
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        preco: Number(p.preco_venda ?? 0),
        estoque: Number(p.estoque_atual ?? 0),
        controlaEstoque: !!p.controla_estoque,
      }));
    },
    staleTime: 60_000,
  });

export const useCatalogoServicos = (empresaId?: string) =>
  useQuery({
    queryKey: ['catalogo-servicos', empresaId],
    enabled: !!empresaId,
    queryFn: async (): Promise<CatalogoServico[]> => {
      const { data, error } = await supabase
        .from('servicos')
        .select('id, codigo, nome, preco')
        .eq('empresa_representada_id', empresaId!)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome')
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        codigo: s.codigo,
        nome: s.nome,
        preco: Number(s.preco ?? 0),
      }));
    },
    staleTime: 60_000,
  });
