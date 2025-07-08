import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CNAEItem {
  codigo: string;
  descricao: string;
}

interface CNAEAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Mock data - em produção, isso viria de uma API
const mockCNAE: CNAEItem[] = [
  { codigo: '4520-0/01', descricao: 'Serviços de manutenção e reparação mecânica de veículos automotores' },
  { codigo: '4520-0/02', descricao: 'Serviços de lanternagem ou pintura de veículos automotores' },
  { codigo: '4520-0/03', descricao: 'Serviços de manutenção e reparação elétrica de veículos automotores' },
  { codigo: '4520-0/04', descricao: 'Serviços de alinhamento e balanceamento de veículos automotores' },
  { codigo: '4520-0/05', descricao: 'Serviços de lavagem, lubrificação e enceramento de veículos automotores' },
  { codigo: '6201-5/00', descricao: 'Desenvolvimento de programas de computador sob encomenda' },
  { codigo: '6202-3/00', descricao: 'Desenvolvimento e licenciamento de programas de computador customizáveis' },
  { codigo: '6203-1/00', descricao: 'Desenvolvimento e licenciamento de programas de computador não-customizáveis' },
  { codigo: '6204-0/00', descricao: 'Consultoria em tecnologia da informação' },
  { codigo: '4711-3/01', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados' },
];

export const CNAEAutocomplete: React.FC<CNAEAutocompleteProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [filteredCNAE, setFilteredCNAE] = useState<CNAEItem[]>([]);

  useEffect(() => {
    if (searchValue.length >= 2) {
      setLoading(true);
      console.log('[CNAEAutocomplete] Buscando CNAE para:', searchValue);
      
      // Simular delay de API
      const timer = setTimeout(() => {
        const filtered = mockCNAE.filter(
          item =>
            item.codigo.toLowerCase().includes(searchValue.toLowerCase()) ||
            item.descricao.toLowerCase().includes(searchValue.toLowerCase())
        );
        setFilteredCNAE(filtered);
        setLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setFilteredCNAE([]);
      setLoading(false);
    }
  }, [searchValue]);

  const handleSelect = (cnaeItem: CNAEItem) => {
    console.log('[CNAEAutocomplete] CNAE selecionado:', cnaeItem);
    onChange(`${cnaeItem.codigo} - ${cnaeItem.descricao}`);
    setOpen(false);
    setSearchValue('');
  };

  const selectedCNAE = value ? mockCNAE.find(item => value.includes(item.codigo)) : null;

  return (
    <div className={className}>
      <Label htmlFor="cnae">CNAE - Atividade Econômica</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedCNAE 
                ? `${selectedCNAE.codigo} - ${selectedCNAE.descricao}`
                : "Buscar atividade econômica..."
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Digite para buscar CNAE..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Buscando...</span>
                </div>
              )}
              
              {!loading && searchValue.length >= 2 && filteredCNAE.length === 0 && (
                <CommandEmpty>Nenhuma atividade encontrada.</CommandEmpty>
              )}
              
              {!loading && searchValue.length < 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar
                </div>
              )}
              
              {!loading && filteredCNAE.length > 0 && (
                <CommandGroup>
                  {filteredCNAE.map((item) => (
                    <CommandItem
                      key={item.codigo}
                      onSelect={() => handleSelect(item)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCNAE?.codigo === item.codigo ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{item.codigo}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.descricao}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          className="mt-1 h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Limpar seleção
        </Button>
      )}
    </div>
  );
};