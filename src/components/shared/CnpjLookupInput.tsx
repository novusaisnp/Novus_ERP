import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { consultarCNPJ, formatarCNPJ, validarCNPJ } from '@/services/cnpjApi';
import type { CNPJData } from '@/types/empresa';
import { toast } from 'sonner';

interface CnpjLookupInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onLookup?: (data: CNPJData) => void;
  autoLookup?: boolean; // default true — busca ao completar 14 dígitos
}

const mask = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d.length === 14 ? formatarCNPJ(d) : d;
};

export const CnpjLookupInput: React.FC<CnpjLookupInputProps> = ({
  value,
  onChange,
  onLookup,
  autoLookup = true,
  placeholder = '00.000.000/0000-00',
  ...rest
}) => {
  const [loading, setLoading] = useState(false);

  const doLookup = async (override?: string) => {
    const source = override ?? value ?? '';
    const clean = source.replace(/\D/g, '');
    if (clean.length !== 14 || !onLookup) return;
    if (!validarCNPJ(clean)) {
      toast.error('CNPJ inválido');
      return;
    }
    setLoading(true);
    try {
      const data = await consultarCNPJ(clean);
      if (!data) toast.warning('CNPJ não encontrado na base pública');
      else onLookup(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        value={value}
        onChange={(e) => {
          const masked = mask(e.target.value);
          onChange(masked);
          if (autoLookup && masked.replace(/\D/g, '').length === 14) {
            void doLookup(masked);
          }
        }}
        onBlur={(e) => {
          rest.onBlur?.(e);
          if (!autoLookup) void doLookup();
        }}
        placeholder={placeholder}
        maxLength={18}
        inputMode="numeric"
      />
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
};

export default CnpjLookupInput;
