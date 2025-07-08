
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

type FormData = {
  nome: string;
  descricao?: string;
};

interface FormDepartamentoFieldsProps {
  form: UseFormReturn<FormData>;
  loading: boolean;
}

export const FormDepartamentoFields: React.FC<FormDepartamentoFieldsProps> = ({ form, loading }) => {
  return (
    <>
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Departamento *</FormLabel>
            <FormControl>
              <Input
                placeholder="Digite o nome do departamento"
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
                placeholder="Descreva as funções do departamento (opcional)"
                className="min-h-[80px] resize-none"
                {...field}
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
