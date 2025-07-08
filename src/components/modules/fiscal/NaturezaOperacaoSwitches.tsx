
import React from 'react';
import { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NaturezaOperacao } from "@/types/fiscal";

interface NaturezaOperacaoSwitchesProps {
  watch: UseFormWatch<NaturezaOperacao>;
  setValue: UseFormSetValue<NaturezaOperacao>;
}

export const NaturezaOperacaoSwitches: React.FC<NaturezaOperacaoSwitchesProps> = ({
  watch,
  setValue
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="flex items-center space-x-2">
        <Switch 
          id="geraDuplicata"
          checked={watch('geraDuplicata')}
          onCheckedChange={(checked) => setValue('geraDuplicata', checked)}
        />
        <Label htmlFor="geraDuplicata">Gera Duplicata</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="movimentaEstoque"
          checked={watch('movimentaEstoque')}
          onCheckedChange={(checked) => setValue('movimentaEstoque', checked)}
        />
        <Label htmlFor="movimentaEstoque">Movimenta Estoque</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="calculaIcms"
          checked={watch('calculaIcms')}
          onCheckedChange={(checked) => setValue('calculaIcms', checked)}
        />
        <Label htmlFor="calculaIcms">Calcula ICMS</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="calculaIpi"
          checked={watch('calculaIpi')}
          onCheckedChange={(checked) => setValue('calculaIpi', checked)}
        />
        <Label htmlFor="calculaIpi">Calcula IPI</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="calculaPisCofins"
          checked={watch('calculaPisCofins')}
          onCheckedChange={(checked) => setValue('calculaPisCofins', checked)}
        />
        <Label htmlFor="calculaPisCofins">Calcula PIS/COFINS</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="ativo"
          checked={watch('ativo')}
          onCheckedChange={(checked) => setValue('ativo', checked)}
        />
        <Label htmlFor="ativo">Ativo</Label>
      </div>
    </div>
  );
};
