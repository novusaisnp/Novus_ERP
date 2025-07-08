
import React from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "R$ 0,00",
  disabled = false
}) => {
  const handleSalaryChange = (inputValue: string) => {
    // Remove caracteres não numéricos
    const numericValue = inputValue.replace(/\D/g, '');
    
    if (numericValue === '') {
      onChange('');
      return;
    }

    // Converte para centavos e depois para reais
    const valueInCents = parseInt(numericValue);
    const valueInReais = valueInCents / 100;
    
    // Formata como moeda brasileira
    const formatted = valueInReais.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    onChange(formatted);
  };

  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => handleSalaryChange(e.target.value)}
      disabled={disabled}
    />
  );
};
