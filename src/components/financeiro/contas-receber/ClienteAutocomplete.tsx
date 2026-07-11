import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientes } from '@/hooks/useClientes';

interface ClienteAutocompleteProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const ClienteAutocomplete: React.FC<ClienteAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Selecione um cliente',
  label = 'Cliente',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { clientes, loading } = useClientes();

  const isPJ = (c: any) => c.tipo === 'J' || c.tipo_pessoa === 'PJ';

  const displayName = (c: any) =>
    isPJ(c)
      ? c.nomeFantasia || c.razaoSocial || c.nome || 'Empresa'
      : c.nome || 'Cliente';

  const documento = (c: any) => c.cpfCnpj || c.cnpj || c.cpf || '';

  const filtered = clientes.filter((c: any) => {
    const s = searchTerm.toLowerCase();
    return (
      displayName(c).toLowerCase().includes(s) ||
      (documento(c) && documento(c).toLowerCase().includes(s))
    );
  });

  const selected = clientes.find((c: any) => c.id === value);

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
          >
            {selected ? displayName(selected) : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Digite para pesquisar cliente..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Carregando...' : 'Nenhum cliente encontrado.'}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((c: any) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange(c.id!);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === c.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex items-center gap-2">
                      {isPJ(c) ? (
                        <Building2 className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{displayName(c)}</span>
                        <span className="text-xs text-muted-foreground">
                          {documento(c)} • {isPJ(c) ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </span>
                      </div>
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
