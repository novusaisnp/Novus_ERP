
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Perfil } from '@/types/empresa';

interface FormPerfilProps {
  perfilId: string;
  perfis: Perfil[];
  onPerfilChange: (perfilId: string) => void;
}

const FormPerfil: React.FC<FormPerfilProps> = ({
  perfilId,
  perfis,
  onPerfilChange
}) => {
  console.log('[Usuarios] FormPerfil - Perfis disponíveis:', perfis.length);

  const perfisAtivos = perfis.filter(p => p.ativo && p.id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-primary border-b pb-2">Perfil de Acesso</h3>
      
      <div className="space-y-2">
        <Label htmlFor="perfilId" className="text-sm font-medium">Perfil *</Label>
        <Select
          value={perfilId}
          onValueChange={onPerfilChange}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um perfil" />
          </SelectTrigger>
          <SelectContent className="bg-white border-2 border-gray-200 shadow-xl z-[60] max-h-[200px] overflow-y-auto">
            {perfisAtivos.length > 0 ? (
              perfisAtivos.map((perfil) => (
                <SelectItem 
                  key={perfil.id} 
                  value={perfil.id!}
                  className="hover:bg-gray-100 focus:bg-gray-100 cursor-pointer py-2 px-3 text-gray-900"
                >
                  <div>
                    <div className="font-medium">{perfil.nome}</div>
                    {perfil.descricao && (
                      <div className="text-xs text-gray-500">{perfil.descricao}</div>
                    )}
                  </div>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="sem-perfis" disabled className="text-gray-500">
                Nenhum perfil ativo encontrado
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FormPerfil;
