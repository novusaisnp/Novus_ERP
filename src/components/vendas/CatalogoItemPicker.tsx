import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCatalogoProdutos, useCatalogoServicos } from '@/hooks/useCatalogoOrcamento';
import type { TipoItem } from '@/services/orcamentosService';
import type { CatalogoProduto, CatalogoServico } from '@/hooks/useCatalogoOrcamento';

export interface CatalogoSelecao {
  id: string;
  descricao: string;
  preco: number;
  estoqueDisponivel?: number;
  controlaEstoque?: boolean;
}

interface Props {
  tipoItem: TipoItem;
  empresaId: string;
  value?: string; // descricao atual
  selectedId?: string | null;
  onSelect: (sel: CatalogoSelecao) => void;
  onChangeText?: (v: string) => void;
}

type CatalogoItemView =
  | {
      id: string;
      label: string;
      hint: string;
      raw: CatalogoProduto;
      tipo: 'P';
    }
  | {
      id: string;
      label: string;
      hint: string;
      raw: CatalogoServico;
      tipo: 'S';
    };

export const CatalogoItemPicker: React.FC<Props> = ({
  tipoItem, empresaId, value, selectedId, onSelect, onChangeText,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const produtosQ = useCatalogoProdutos(tipoItem === 'P' ? empresaId : undefined);
  const servicosQ = useCatalogoServicos(tipoItem === 'S' ? empresaId : undefined);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  const items = useMemo<CatalogoItemView[]>(() => {
    if (tipoItem === 'P') {
      return (produtosQ.data ?? []).map((p) => ({
        id: p.id,
        label: `${p.codigo ? p.codigo + ' — ' : ''}${p.nome}`,
        hint: `Estoque: ${p.estoque} · ${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        raw: p,
        tipo: 'P',
      }));
    }
    return (servicosQ.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.codigo ? s.codigo + ' — ' : ''}${s.nome}`,
      hint: s.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      raw: s,
      tipo: 'S',
    }));
  }, [tipoItem, produtosQ.data, servicosQ.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 200);
    return items
      .filter((i) => i.label.toLowerCase().includes(q))
      .slice(0, 200);
  }, [items, query]);

  const loading = tipoItem === 'P' ? produtosQ.isLoading : servicosQ.isLoading;
  const label = value?.trim() || (tipoItem === 'P' ? 'Buscar produto...' : 'Buscar serviço...');

  const handleChoose = (item: CatalogoItemView) => {
    const sel: CatalogoSelecao =
      item.tipo === 'P'
        ? {
            id: item.id,
            descricao: item.raw.nome,
            preco: item.raw.preco,
            estoqueDisponivel: item.raw.estoque,
            controlaEstoque: item.raw.controlaEstoque,
          }
        : {
            id: item.id,
            descricao: item.raw.nome,
            preco: item.raw.preco,
          };
    onSelect(sel);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!empresaId}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'w-full justify-between font-normal h-9',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0" />
            {label}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[60] w-[min(420px,calc(100vw-3rem))] rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              autoFocus
              placeholder={tipoItem === 'P' ? 'Buscar por código ou nome...' : 'Buscar serviço...'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
              className="h-11 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto p-1">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Carregando catálogo...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum item encontrado no banco.
                {query && (
                  <button
                    type="button"
                    className="block mx-auto mt-2 text-primary underline text-xs"
                    onClick={() => {
                      onChangeText?.(query);
                      setOpen(false);
                    }}
                  >
                    Usar "{query}" como descrição livre
                  </button>
                )}
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div className="space-y-1">
                {filtered.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => handleChoose(i)}
                  >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedId === i.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm">{i.label}</span>
                          <span className="text-xs text-muted-foreground">{i.hint}</span>
                        </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
