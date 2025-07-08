// [Refatoração] Mudança para Gestão Bancária

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Archive, RotateCcw, Building2 } from 'lucide-react';
import { Banco } from '@/types/banco';

interface BancoCardProps {
  banco: Banco;
  onEdit: (banco: Banco) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  isArchiving?: boolean;
  isRestoring?: boolean;
}

export const BancoCard = ({
  banco,
  onEdit,
  onArchive,
  onRestore,
  isArchiving,
  isRestoring,
}: BancoCardProps) => {
  const isArquivado = !!banco.deleted_at;

  return (
    <Card className={`${isArquivado ? 'opacity-75 bg-gray-50' : ''} hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-medium">
            {banco.codigo} - {banco.nome}
          </CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(banco)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {isArquivado ? (
              <DropdownMenuItem 
                onClick={() => onRestore(banco.id)}
                disabled={isRestoring}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={() => onArchive(banco.id)}
                disabled={isArchiving}
              >
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {banco.sigla && (
            <div className="text-sm text-gray-600">
              Sigla: <span className="font-medium">{banco.sigla}</span>
            </div>
          )}
          <div className="text-sm text-gray-600">
            País: <span className="font-medium">{banco.pais}</span>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={banco.ativo ? 'default' : 'secondary'}>
              {banco.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
            {isArquivado && (
              <Badge variant="destructive">Arquivado</Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Criado em: {new Date(banco.created_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};