import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCatalogoProdutos, useCatalogoServicos } from '@/hooks/useCatalogoOrcamento';
import type { TipoItem } from '@/services/orcamentosService';

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

export const CatalogoItemPicker: React.FC<Props> = ({
  tipoItem, empresaId, value, selectedId, onSelect, onChangeText,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const produtosQ = useCatalogoProdutos(tipoItem === 'P' ? empresaId : undefined);
  const servicosQ = useCatalogoServicos(tipoItem === 'S' ? empresaId : undefined);

  const items = useMemo(() => {
    if (tipoItem === 'P') {
      return (produtosQ.data ?? []).map((p) => ({
        id: p.id,
        label: `${p.codigo ? p.codigo + ' — ' : ''}${p.nome}`,
        hint: `Estoque: ${p.estoque} · ${p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        raw: p,
      }));
    }
    return (servicosQ.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.codigo ? s.codigo + ' — ' : ''}${s.nome}`,
      hint: s.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      raw: s,
    }));
  }, [tipoItem, produtosQ.data, servicosQ.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items
      .filter((i) => i.label.toLowerCase().includes(q))
      .slice(0, 50);
  }, [items, query]);

  const loading = tipoItem === 'P' ? produtosQ.isLoading : servicosQ.isLoading;
  const label = value?.trim() || (tipoItem === 'P' ? 'Buscar produto...' : 'Buscar serviço...');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={!empresaId}
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
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={tipoItem === 'P' ? 'Buscar por código ou nome...' : 'Buscar serviço...'}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Carregando catálogo...</div>
            )}
            {!loading && (
              <>
                <CommandEmpty>
                  <div className="py-2 text-sm">
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
                </CommandEmpty>
                <CommandGroup>
                  {filtered.map((i) => (
                    <CommandItem
                      key={i.id}
                      value={i.id}
                      onSelect={() => {
                        const sel: CatalogoSelecao =
                          tipoItem === 'P'
                            ? {
                                id: i.id,
                                descricao: (i.raw as any).nome,
                                preco: (i.raw as any).preco,
                                estoqueDisponivel: (i.raw as any).estoque,
                                controlaEstoque: (i.raw as any).controlaEstoque,
                              }
                            : {
                                id: i.id,
                                descricao: (i.raw as any).nome,
                                preco: (i.raw as any).preco,
                              };
                        onSelect(sel);
                        setOpen(false);
                        setQuery('');
                      }}
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
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
