
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Colaborador } from '@/types/rh';
import { EmpresaRepresentada } from '@/types/empresa';

interface FormVinculoColaboradorProps {
  colaboradorId: string;
  empresaRepresentadaId: string;
  colaboradores: Colaborador[];
  empresas: EmpresaRepresentada[];
  onColaboradorChange: (colaboradorId: string) => void;
  onEmpresaChange: (empresaId: string) => void;
}

const FormVinculoColaborador: React.FC<FormVinculoColaboradorProps> = ({
  colaboradorId,
  empresaRepresentadaId,
  colaboradores,
  empresas,
  onColaboradorChange,
  onEmpresaChange
}) => {
  console.log('[Usuarios] FormVinculoColaborador - Colaboradores disponíveis:', colaboradores.length);
  console.log('[Usuarios] FormVinculoColaborador - Empresas disponíveis:', empresas.length);

  const colaboradoresAtivos = colaboradores.filter(c => c.situacao && c.id);
  const empresasAtivas = empresas.filter(e => e.ativa && e.id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-primary border-b pb-2">Vínculo Empresarial</h3>
      
      <div className="space-y-2">
        <Label htmlFor="colaboradorId" className="text-sm font-medium">Colaborador *</Label>
        <Select
          value={colaboradorId}
          onValueChange={onColaboradorChange}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um colaborador" />
          </SelectTrigger>
          <SelectContent className="bg-white border-2 border-gray-200 shadow-xl z-[60] max-h-[200px] overflow-y-auto">
            {colaboradoresAtivos.length > 0 ? (
              colaboradoresAtivos.map((colaborador) => (
                <SelectItem 
                  key={colaborador.id} 
                  value={colaborador.id!}
                  className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer py-2 px-3 text-gray-900"
                >
                  {colaborador.nomeCompleto}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="sem-colaboradores" disabled className="text-gray-500">
                Nenhum colaborador ativo encontrado
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="empresaRepresentadaId" className="text-sm font-medium">Empresa Representada *</Label>
        <Select
          value={empresaRepresentadaId}
          onValueChange={onEmpresaChange}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma empresa" />
          </SelectTrigger>
          <SelectContent className="bg-white border-2 border-gray-200 shadow-xl z-[60] max-h-[200px] overflow-y-auto">
            {empresasAtivas.length > 0 ? (
              empresasAtivas.map((empresa) => (
                <SelectItem 
                  key={empresa.id} 
                  value={empresa.id!}
                  className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer py-2 px-3 text-gray-900"
                >
                  {empresa.razaoSocial}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="sem-empresas" disabled className="text-gray-500">
                Nenhuma empresa ativa encontrada
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FormVinculoColaborador;
