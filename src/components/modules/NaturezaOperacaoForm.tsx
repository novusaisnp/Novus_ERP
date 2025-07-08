
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileSpreadsheet } from "lucide-react";
import { useForm } from "react-hook-form";
import { NaturezaOperacao } from "@/types/fiscal";
import { useCFOPs } from "@/hooks/useFiscal";
import { NaturezaOperacaoFormFields } from "./fiscal/NaturezaOperacaoFormFields";
import { NaturezaOperacaoCFOPFields } from "./fiscal/NaturezaOperacaoCFOPFields";
import { NaturezaOperacaoSwitches } from "./fiscal/NaturezaOperacaoSwitches";

console.log('[Fiscal] Inicializando NaturezaOperacaoForm refatorado');

interface NaturezaOperacaoFormProps {
  natureza?: NaturezaOperacao;
  onClose?: () => void;
  onSave?: (data: NaturezaOperacao) => void;
}

export const NaturezaOperacaoForm: React.FC<NaturezaOperacaoFormProps> = ({ 
  natureza, 
  onClose, 
  onSave 
}) => {
  const { data: cfops } = useCFOPs();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<NaturezaOperacao>({
    defaultValues: natureza || {
      codigo: '',
      descricao: '',
      tipo: 'venda',
      finalidade: 'normal',
      geraDuplicata: true,
      movimentaEstoque: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaPisCofins: true,
      ativo: true
    }
  });

  const onSubmit = async (data: NaturezaOperacao) => {
    console.log('[Fiscal] Submetendo natureza de operação:', data);
    onSave?.(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Natureza de Operação
        </CardTitle>
        <CardDescription>
          Configure as naturezas de operação para diferentes tipos de transações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <NaturezaOperacaoFormFields
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
          />

          <NaturezaOperacaoCFOPFields
            watch={watch}
            setValue={setValue}
            cfops={cfops}
          />

          <NaturezaOperacaoSwitches
            watch={watch}
            setValue={setValue}
          />

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              placeholder="Observações adicionais sobre esta natureza de operação"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="min-w-[120px]">
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
