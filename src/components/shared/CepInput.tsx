import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { consultarCEP } from '@/services/cnpjApi';
import { toast } from 'sonner';

export interface CepAddress {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
}

interface CepInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onAddressFound?: (address: CepAddress) => void;
}

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

export const CepInput: React.FC<CepInputProps> = ({
  value,
  onChange,
  onAddressFound,
  placeholder = '00000-000',
  ...rest
}) => {
  const [loading, setLoading] = useState(false);

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    rest.onBlur?.(e);
    const clean = (value || '').replace(/\D/g, '');
    if (clean.length !== 8 || !onAddressFound) return;
    setLoading(true);
    try {
      const data = await consultarCEP(clean);
      if (!data) {
        toast.error('CEP não encontrado');
        return;
      }
      onAddressFound({
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        complemento: data.complemento,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        value={value}
        onChange={(e) => onChange(formatCep(e.target.value))}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={9}
        inputMode="numeric"
      />
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
};

export default CepInput;
