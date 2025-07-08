
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmpresaRepresentada, Perfil } from '@/types/empresa';

interface UsuarioFiltersProps {
  empresas: EmpresaRepresentada[];
  perfis: Perfil[];
  filtroEmpresa: string;
  filtroPerfil: string;
  usuariosCount: number;
  onFiltroEmpresaChange: (value: string) => void;
  onFiltroPerfilChange: (value: string) => void;
}

const UsuarioFilters: React.FC<UsuarioFiltersProps> = ({
  empresas,
  perfis,
  filtroEmpresa,
  filtroPerfil,
  usuariosCount,
  onFiltroEmpresaChange,
  onFiltroPerfilChange
}) => {
  const empresasAtivas = empresas.filter(empresa => empresa.ativa && empresa.id);
  const perfisAtivos = perfis.filter(perfil => perfil.ativo && perfil.id);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Filtrar por Empresa</Label>
            <Select value={filtroEmpresa} onValueChange={onFiltroEmpresaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="todos">Todas as empresas</SelectItem>
                {empresasAtivas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id!}>
                    {empresa.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Filtrar por Perfil</Label>
            <Select value={filtroPerfil} onValueChange={onFiltroPerfilChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os perfis" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="todos">Todos os perfis</SelectItem>
                {perfisAtivos.map((perfil) => (
                  <SelectItem key={perfil.id} value={perfil.id!}>
                    {perfil.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Badge variant="outline" className="text-sm">
              {usuariosCount} usuário(s) encontrado(s)
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsuarioFilters;
