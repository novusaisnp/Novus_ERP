
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from './CurrencyInput';
import { CargoCategoriaPadrao } from '@/types/rh';

type FormData = {
  nome: string;
  descricao?: string;
  salarioBase?: string;
  categoriaPadrao?: CargoCategoriaPadrao | null;
};

const CATEGORIA_LABELS: Record<CargoCategoriaPadrao, string> = {
  atendimento_operacional: 'Atendimento operacional',
  coordenacao_administrativa: 'Coordenação administrativa',
  administrativo: 'Administrativo',
  financeiro: 'Financeiro',
  diretoria: 'Diretoria',
  outro: 'Outro',
};

interface FormCargoFieldsProps {
  form: UseFormReturn<FormData>;
  loading: boolean;
}

export const FormCargoFields: React.FC<FormCargoFieldsProps> = ({ form, loading }) => {
  return (
    <>
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Cargo *</FormLabel>
            <FormControl>
              <Input
                placeholder="Digite o nome do cargo"
                {...field}
                disabled={loading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="descricao"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva as responsabilidades do cargo (opcional)"
                className="min-h-[80px] resize-none"
                {...field}
                disabled={loading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="categoriaPadrao"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Categoria (sugestão de acesso p/ satélites)</FormLabel>
            <FormControl>
              <Select
                onValueChange={(value) => field.onChange(value as CargoCategoriaPadrao)}
                value={field.value ?? undefined}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria (sem sugestão automática)" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="salarioBase"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Salário Base</FormLabel>
            <FormControl>
              <CurrencyInput
                placeholder="R$ 0,00"
                value={field.value || ''}
                onChange={field.onChange}
                disabled={loading}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
