import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  const { contas, isLoading, shouldShowResults, handleSearchChange, searchTerm } =
    useContaContabilSearch(tipo);

  // resolve label do valor selecionado quando não está na lista de busca
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar conta de ${tipo.toLowerCase()}...`}
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </div>
            )}
            {!isLoading && !shouldShowResults && (
              <div className="p-4 text-sm text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </div>
            )}
            {!isLoading && shouldShowResults && (
              <>
                <CommandEmpty>Nenhuma conta analítica encontrada.</CommandEmpty>
                <CommandGroup>
                  {value && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => {
                        onChange(null);
                        setOpen(false);
                      }}
                      className="text-muted-foreground"
                    >
                      Limpar seleção
                    </CommandItem>
                  )}
                  {contas.map((conta: PlanoContas) => (
                    <CommandItem
                      key={conta.id}
                      value={conta.id}
                      onSelect={() => {
                        onChange(conta.id);
                        setSelectedLabel(`${conta.codigo} — ${conta.nome}`);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === conta.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="font-mono text-xs mr-2">{conta.codigo}</span>
                      <span className="truncate">{conta.nome}</span>
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
