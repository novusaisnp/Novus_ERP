
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContaContabilSearch } from '@/hooks/useContaContabilSearch';
import type { PlanoContas } from '@/types/planoContas';

type SelectedConta = Pick<PlanoContas, 'id' | 'codigo' | 'nome'>;

interface ContaContabilAutocompleteProps {
  value?: string;
  onChange: (value: string, conta?: SelectedConta) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  tipo?: 'RECEITA' | 'DESPESA';
  selectedConta?: SelectedConta;
}

export const ContaContabilAutocomplete: React.FC<ContaContabilAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Selecione uma conta analítica",
  label = "Conta Contábil",
  required = false,
  tipo = 'DESPESA',
  selectedConta,
}) => {
  const [open, setOpen] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const { contas, isLoading, handleSearchChange } = useContaContabilSearch(tipo);

  console.log('[ContaContabilAutocomplete] Renderizando com value:', value, 'contas disponíveis:', contas.length);

  const displayedConta = contas.find(conta => conta.id === value) || (selectedConta?.id === value ? selectedConta : undefined);

  // Resetar busca quando o popover abre
  useEffect(() => {
    if (open) {
      setInternalSearchTerm('');
      handleSearchChange('');
    }
  }, [open, handleSearchChange]);

  const handleSelect = (contaId: string, conta?: SelectedConta) => {
    console.log('[ContaContabilAutocomplete] Conta selecionada:', contaId);
    onChange(contaId, conta);
    setOpen(false);
    setInternalSearchTerm('');
  };

  const handleInputChange = (searchValue: string) => {
    console.log('[ContaContabilAutocomplete] Termo digitado:', searchValue);
    setInternalSearchTerm(searchValue);
    handleSearchChange(searchValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Se há apenas uma conta na lista, selecionar automaticamente
      if (contas.length === 1) {
        console.log('[ContaContabilAutocomplete] Enter pressionado - selecionando única conta disponível');
        handleSelect(contas[0].id, {
          id: contas[0].id,
          codigo: contas[0].codigo,
          nome: contas[0].nome,
        });
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            type="button"
          >
            {displayedConta 
              ? `${displayedConta.codigo} - ${displayedConta.nome}`
              : placeholder
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Digite para pesquisar..."
              value={internalSearchTerm}
              onValueChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Carregando..." : 
                 internalSearchTerm.length < 2 ? "Digite pelo menos 2 caracteres..." : 
                 `Nenhuma conta de ${tipo === 'RECEITA' ? 'receita' : 'despesa'} encontrada.`}
              </CommandEmpty>
              <CommandGroup>
                {contas.map((conta) => (
        <CommandItem
                    key={conta.id}
                    value={conta.id}
          onSelect={(currentValue) => {
                      console.log('[ContaContabilAutocomplete] CommandItem onSelect chamado:', currentValue);
            handleSelect(conta.id, {
              id: conta.id,
              codigo: conta.codigo,
              nome: conta.nome,
            });
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === conta.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{conta.codigo} - {conta.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        Nível {conta.nivel} • Analítica • {conta.tipo}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
