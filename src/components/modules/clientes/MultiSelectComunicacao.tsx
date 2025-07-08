import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { meiosComunicacao } from '@/data/meiosComunicacao';

interface MultiSelectComunicacaoProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

export const MultiSelectComunicacao: React.FC<MultiSelectComunicacaoProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedValue: string) => {
    console.log('[MultiSelectComunicacao] Selecionando meio:', selectedValue);
    const newValue = value.includes(selectedValue)
      ? value.filter(item => item !== selectedValue)
      : [...value, selectedValue];
    onChange(newValue);
  };

  const handleRemove = (itemToRemove: string) => {
    console.log('[MultiSelectComunicacao] Removendo meio:', itemToRemove);
    onChange(value.filter(item => item !== itemToRemove));
  };

  const getSelectedLabels = () => {
    return value.map(v => {
      const item = meiosComunicacao.find(meio => meio.value === v);
      return item ? item.label : v;
    });
  };

  return (
    <div className={className}>
      <Label>Meios de Comunicação Preferenciais</Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[40px] h-auto"
          >
            <div className="flex flex-wrap gap-1 flex-1 mr-2">
              {value.length === 0 ? (
                <span className="text-muted-foreground">Selecionar meios de comunicação...</span>
              ) : (
                getSelectedLabels().map((label, index) => (
                  <Badge key={value[index]} variant="secondary" className="text-xs">
                    {label}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(value[index]);
                      }}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar meio de comunicação..." />
            <CommandList>
              <CommandEmpty>Nenhum meio encontrado.</CommandEmpty>
              <CommandGroup>
                {meiosComunicacao.map((meio) => (
                  <CommandItem
                    key={meio.value}
                    onSelect={() => handleSelect(meio.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(meio.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {meio.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {getSelectedLabels().map((label, index) => (
            <Badge key={value[index]} variant="outline" className="text-xs">
              {label}
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemove(value[index])}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};