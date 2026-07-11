import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContaContabilSearch } from '@/hooks/useContaContabilSearch';
import { planoContasService } from '@/services/planoContasService';
import type { PlanoContas } from '@/types/planoContas';

interface PlanoContaComboboxProps {
  tipo: 'RECEITA' | 'DESPESA';
  value?: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PlanoContaCombobox: React.FC<PlanoContaComboboxProps> = ({
  tipo,
  value,
  onChange,
  placeholder = 'Selecione a conta...',
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { contas, isLoading, shouldShowResults, handleSearchChange, searchTerm } =
    useContaContabilSearch(tipo);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value) {
        setSelectedLabel('');
        return;
      }
      const inList = contas.find((c: PlanoContas) => c.id === value);
      if (inList) {
        setSelectedLabel(`${inList.codigo} — ${inList.nome}`);
        return;
      }
      try {
        const all = await planoContasService.getAll();
        if (cancelled) return;
        const found = all.find((c: PlanoContas) => c.id === value);
        setSelectedLabel(found ? `${found.codigo} — ${found.nome}` : '');
      } catch {
        setSelectedLabel('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, contas]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleSelect = (conta: PlanoContas) => {
    onChange(conta.id);
    setSelectedLabel(`${conta.codigo} — ${conta.nome}`);
    setOpen(false);
    handleSearchChange('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSelectedLabel('');
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="opacity-60 hover:opacity-100"
              aria-label="Limpar"
            >
              <X className="h-4 w-4" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2 border-b">
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={`Buscar conta de ${tipo.toLowerCase()}...`}
              className="h-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {isLoading && (
              <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </div>
            )}
            {!isLoading && !shouldShowResults && (
              <div className="p-3 text-sm text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </div>
            )}
            {!isLoading && shouldShowResults && contas.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">
                Nenhuma conta analítica encontrada
              </div>
            )}
            {!isLoading &&
              shouldShowResults &&
              contas.map((conta: PlanoContas) => (
                <button
                  key={conta.id}
                  type="button"
                  onClick={() => handleSelect(conta)}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground',
                    value === conta.id && 'bg-accent/50',
                  )}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === conta.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="font-mono text-xs mr-2 shrink-0">{conta.codigo}</span>
                  <span className="truncate">{conta.nome}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
