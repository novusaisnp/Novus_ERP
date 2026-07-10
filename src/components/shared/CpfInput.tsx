import React from 'react';
import { Input } from '@/components/ui/input';
import { validarCPF, formatarCPF } from '@/services/cnpjApi';
import { toast } from 'sonner';

interface CpfInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (valid: boolean) => void;
}

const mask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.length === 11 ? formatarCPF(d) : d;
};

export const CpfInput: React.FC<CpfInputProps> = ({
  value,
  onChange,
  onValidChange,
  placeholder = '000.000.000-00',
  ...rest
}) => {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    rest.onBlur?.(e);
    const clean = (value || '').replace(/\D/g, '');
    if (!clean) return;
    const ok = validarCPF(clean);
    onValidChange?.(ok);
    if (!ok) toast.error('CPF inválido — verifique os dígitos');
  };

  return (
    <Input
      {...rest}
      value={value}
      onChange={(e) => onChange(mask(e.target.value))}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={14}
      inputMode="numeric"
    />
  );
};

export default CpfInput;
