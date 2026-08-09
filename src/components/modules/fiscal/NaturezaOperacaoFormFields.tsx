
import React from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NaturezaOperacao, TIPOS_OPERACAO } from "@/types/fiscal";

interface NaturezaOperacaoFormFieldsProps {
  register: UseFormRegister<NaturezaOperacao>;
  watch: UseFormWatch<NaturezaOperacao>;
  setValue: UseFormSetValue<NaturezaOperacao>;
  errors: FieldErrors<NaturezaOperacao>;
}

export const NaturezaOperacaoFormFields: React.FC<NaturezaOperacaoFormFieldsProps> = ({
  register,
  watch,
  setValue,
  errors
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="codigo">Código *</Label>
        <Input
          id="codigo"
          {...register('codigo', { required: 'Código é obrigatório' })}
          placeholder="Ex: VENDA"
          className={errors.codigo ? "border-status-cancelled" : ""}
        />
        {errors.codigo && (
          <span className="text-sm text-status-cancelled">{errors.codigo.message}</span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo *</Label>
        <Select 
          value={watch('tipo')} 
          onValueChange={(value) => setValue('tipo', value as typeof TIPOS_OPERACAO[number])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_OPERACAO.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2 space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          {...register('descricao', { required: 'Descrição é obrigatória' })}
          placeholder="Ex: Venda de Mercadorias"
          className={errors.descricao ? "border-status-cancelled" : ""}
        />
        {errors.descricao && (
          <span className="text-sm text-status-cancelled">{errors.descricao.message}</span>
        )}
      </div>
    </div>
  );
};
