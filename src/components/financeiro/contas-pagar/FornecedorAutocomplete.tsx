
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { QuickAddEntidade } from '@/components/shared/QuickAddEntidadeDialog';
import type { Fornecedor } from '@/types/fornecedor';

interface FornecedorAutocompleteProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const FornecedorAutocomplete: React.FC<FornecedorAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Selecione um fornecedor",
  label = "Fornecedor",
  required = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();
  const { fornecedores, loading } = useFornecedores();

  // Filtrar fornecedores baseado no termo de pesquisa
  const filteredFornecedores = fornecedores.filter(fornecedor => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    const nome = fornecedor.tipo_pessoa === 'PJ'
      ? (fornecedor.razaoSocial || fornecedor.nomeFantasia || '')
      : (fornecedor.nome_completo || '');
    const documento = fornecedor.tipo_pessoa === 'PJ' ? fornecedor.cnpj : fornecedor.cpf;

    return nome.toLowerCase().includes(searchLower) ||
           (documento && documento.toLowerCase().includes(searchLower));
  });

  const selectedFornecedor = fornecedores.find(fornecedor => fornecedor.id === value);

  const handleSelect = (fornecedorId: string) => {
    onChange(fornecedorId);
    setOpen(false);
  };

  const getFornecedorDisplayName = (fornecedor: Fornecedor) => {
    if (fornecedor.tipo_pessoa === 'PJ') {
      return fornecedor.nomeFantasia || fornecedor.razaoSocial || 'Empresa';
    }
    return fornecedor.nome_completo || 'Pessoa Física';
  };

  const getFornecedorDocument = (fornecedor: Fornecedor) => {
    return fornecedor.tipo_pessoa === 'PJ' ? fornecedor.cnpj : fornecedor.cpf;
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedFornecedor
                ? getFornecedorDisplayName(selectedFornecedor)
                : placeholder
              }
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Digite para pesquisar fornecedor..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Carregando..." : "Nenhum fornecedor encontrado."}
                </CommandEmpty>
                <CommandGroup>
                  {filteredFornecedores.map((fornecedor) => (
                    <CommandItem
                      key={fornecedor.id}
                      value={fornecedor.id}
                      onSelect={() => handleSelect(fornecedor.id!)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === fornecedor.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        {fornecedor.tipo_pessoa === 'PJ' ? (
                          <Building2 className="h-4 w-4 text-blue-500" />
                        ) : (
                          <User className="h-4 w-4 text-green-500" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{getFornecedorDisplayName(fornecedor)}</span>
                          <span className="text-xs text-muted-foreground">
                            {getFornecedorDocument(fornecedor)} • {fornecedor.tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
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
        <QuickAddEntidade
          papel="FORNECEDOR"
          empresaRepresentadaId={empresaId}
          onCreated={async ({ id }) => {
            await queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
            handleSelect(id);
          }}
        />
      </div>
    </div>
  );
};
