
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type FormData = {
  codigo: string;
  descricao: string;
  tipo: 'FIXO' | 'PERCENTUAL' | 'TABELA';
  valor?: string;
  percentual?: string;
  tabelaProgressiva?: any;
};

interface FormDescontoPadraoFieldsProps {
  form: UseFormReturn<FormData>;
  loading: boolean;
}

export const FormDescontoPadraoFields: React.FC<FormDescontoPadraoFieldsProps> = ({ 
  form, 
  loading 
}) => {
  const tipoSelecionado = form.watch('tipo');

  return (
    <>
      <FormField
        control={form.control}
        name="codigo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código *</FormLabel>
            <FormControl>
              <Input
                placeholder="Ex: VT, FALTA, DESC01"
                maxLength={10}
                {...field}
                disabled={loading}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
            <FormLabel>Descrição *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva o desconto (ex: Vale Transporte, Faltas, etc.)"
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
        name="tipo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Desconto *</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={loading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="FIXO">Valor Fixo</SelectItem>
                <SelectItem value="PERCENTUAL">Percentual</SelectItem>
                <SelectItem value="TABELA">Tabela Progressiva</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {tipoSelecionado === 'FIXO' && (
        <FormField
          control={form.control}
          name="valor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Fixo (R$) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {tipoSelecionado === 'PERCENTUAL' && (
        <FormField
          control={form.control}
          name="percentual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Percentual (%) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {tipoSelecionado === 'TABELA' && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Tabela progressiva estará disponível em uma próxima versão.
            Por enquanto, use valores fixos ou percentuais.
          </p>
        </div>
      )}
    </>
  );
};
