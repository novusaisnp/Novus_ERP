import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import { colaboradorService } from '@/services/colaboradorService';

type FormData = {
  nome: string;
  descricao?: string;
  responsavelId?: string;
};

interface FormDepartamentoFieldsProps {
  form: UseFormReturn<FormData>;
  loading: boolean;
}

export const FormDepartamentoFields: React.FC<FormDepartamentoFieldsProps> = ({ form, loading }) => {
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: colaboradorService.fetchColaboradores,
  });

  return (
    <>
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Departamento *</FormLabel>
            <FormControl>
              <Input placeholder="Digite o nome do departamento" {...field} disabled={loading} />
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

      <FormField
        control={form.control}
        name="responsavelId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Responsável</FormLabel>
            <Select
              value={field.value || ''}
              onValueChange={field.onChange}
              disabled={loading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador (opcional)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {colaboradores
                  .filter((c) => c.ativo !== false)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
