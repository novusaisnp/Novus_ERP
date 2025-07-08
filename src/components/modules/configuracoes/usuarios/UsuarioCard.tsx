
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Edit, Trash2, UserCheck, UserX, Mail, Calendar } from 'lucide-react';
import { Usuario, EmpresaRepresentada, Perfil } from '@/types/empresa';
import { formatarCPF } from '@/services/cnpjApi';

interface UsuarioCardProps {
  usuario: Usuario;
  empresas: EmpresaRepresentada[];
  perfis: Perfil[];
  onEdit: (usuario: Usuario) => void;
  onDelete: (usuario: Usuario) => void;
}

const UsuarioCard: React.FC<UsuarioCardProps> = ({
  usuario,
  empresas,
  perfis,
  onEdit,
  onDelete
}) => {
  const getEmpresaNome = (empresaId: string) => {
    const empresa = empresas.find(e => e.id === empresaId);
    return empresa ? empresa.razaoSocial : 'Empresa não encontrada';
  };

  const getPerfilNome = (perfilId: string) => {
    const perfil = perfis.find(p => p.id === perfilId);
    return perfil ? perfil.nome : 'Perfil não encontrado';
  };

  const formatarDataLogin = (data?: Date) => {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          {usuario.nomeCompleto}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{formatarCPF(usuario.cpf)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={usuario.ativo ? "default" : "secondary"}>
            {usuario.ativo ? (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <UserX className="w-3 h-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
          <Badge variant="outline">
            {getPerfilNome(usuario.perfilId)}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {usuario.email}
          </p>
          <p className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Último login: {formatarDataLogin(usuario.ultimoLogin)}
          </p>
          <p className="font-medium text-foreground">
            {getEmpresaNome(usuario.empresaRepresentadaId)}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(usuario)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(usuario)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsuarioCard;
