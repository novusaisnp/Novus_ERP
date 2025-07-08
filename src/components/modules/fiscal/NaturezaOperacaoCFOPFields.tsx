
import React from 'react';
import { UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NaturezaOperacao, CFOP } from "@/types/fiscal";

interface NaturezaOperacaoCFOPFieldsProps {
  watch: UseFormWatch<NaturezaOperacao>;
  setValue: UseFormSetValue<NaturezaOperacao>;
  cfops?: CFOP[];
}

export const NaturezaOperacaoCFOPFields: React.FC<NaturezaOperacaoCFOPFieldsProps> = ({
  watch,
  setValue,
  cfops = []
}) => {
  const cfopsSaida = cfops.filter(c => c.tipo === 'saida');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="cfopDentro">CFOP Dentro do Estado</Label>
        <Select 
          value={watch('cfopDentroEstado')} 
          onValueChange={(value) => setValue('cfopDentroEstado', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {cfopsSaida.filter(c => c.destino === 'interno').map((cfop) => (
              <SelectItem key={cfop.id} value={cfop.codigo}>
                {cfop.codigo} - {cfop.descricao.substring(0, 50)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cfopFora">CFOP Fora do Estado</Label>
        <Select 
          value={watch('cfopForaEstado')} 
          onValueChange={(value) => setValue('cfopForaEstado', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {cfopsSaida.filter(c => c.destino === 'interestadual').map((cfop) => (
              <SelectItem key={cfop.id} value={cfop.codigo}>
                {cfop.codigo} - {cfop.descricao.substring(0, 50)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cfopExterior">CFOP Exterior</Label>
        <Select 
          value={watch('cfopExterior')} 
          onValueChange={(value) => setValue('cfopExterior', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {cfopsSaida.filter(c => c.destino === 'exterior').map((cfop) => (
              <SelectItem key={cfop.id} value={cfop.codigo}>
                {cfop.codigo} - {cfop.descricao.substring(0, 50)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
