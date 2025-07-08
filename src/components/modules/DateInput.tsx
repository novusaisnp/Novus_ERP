
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateInputProps {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  required?: boolean;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
  disabled?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  placeholder = "dd/mm/aaaa",
  maxDate,
  minDate,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Sincronizar valor do input com prop value
  useEffect(() => {
    if (value) {
      setInputValue(format(value, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  }, [value]);

  // Função para formatar a data conforme o usuário digita
  const formatDateInput = (input: string) => {
    // Remove tudo que não for número
    const numbers = input.replace(/\D/g, '');
    
    // Aplica a máscara dd/mm/aaaa
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  // Função para validar e converter a data
  const parseInputDate = (input: string): Date | null => {
    if (!input || input.length < 10) return null;
    
    try {
      // Tenta fazer o parse da data no formato dd/MM/yyyy
      const parsedDate = parse(input, 'dd/MM/yyyy', new Date());
      
      if (!isValid(parsedDate)) return null;
      
      // Verifica limites se especificados
      if (maxDate && parsedDate > maxDate) return null;
      if (minDate && parsedDate < minDate) return null;
      
      return parsedDate;
    } catch (error) {
      console.error('[DateInput] Erro ao fazer parse da data:', error);
      return null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = formatDateInput(e.target.value);
    setInputValue(newValue);

    // Se a data estiver completa, tenta fazer o parse
    if (newValue.length === 10) {
      const parsedDate = parseInputDate(newValue);
      if (parsedDate) {
        onChange(parsedDate);
      }
    } else if (newValue === '') {
      onChange(undefined);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.length === 10) {
      const parsedDate = parseInputDate(inputValue);
      if (parsedDate) {
        // Reformat para garantir consistência
        setInputValue(format(parsedDate, 'dd/MM/yyyy'));
        onChange(parsedDate);
      } else {
        // Data inválida, limpa o campo
        setInputValue('');
        onChange(undefined);
      }
    } else if (inputValue.length > 0 && inputValue.length < 10) {
      // Data incompleta, limpa o campo
      setInputValue('');
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className="flex-1"
          disabled={disabled}
          maxLength={10}
        />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={disabled}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              disabled={(date) => {
                if (maxDate && date > maxDate) return true;
                if (minDate && date < minDate) return true;
                return false;
              }}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
