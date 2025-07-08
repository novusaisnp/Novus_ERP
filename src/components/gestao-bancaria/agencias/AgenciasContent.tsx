
import React from 'react';
import { Edit, MoreHorizontal, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArchiveButton } from '@/components/ui/ArchiveButton';
import { RestoreButton } from '@/components/ui/RestoreButton';
import { Agencia } from '@/types/agencia';
import { AgenciaEmptyState } from './AgenciaEmptyState';

interface AgenciasContentProps {
  agencias: Agencia[];
  isLoading: boolean;
  onEdit: (agencia: Agencia) => void;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onCreateClick: () => void;
  isArchiving: boolean;
  isRestoring: boolean;
}

export const AgenciasContent: React.FC<AgenciasContentProps> = ({
  agencias,
  isLoading,
  onEdit,
  onArchive,
  onRestore,
  onCreateClick,
  isArchiving,
  isRestoring,
}) => {
  console.log('[AgenciasContent] Renderizando com', agencias.length, 'agências');

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (agencias.length === 0) {
    return <AgenciaEmptyState onCreateClick={onCreateClick} />;
  }

  const formatarEndereco = (endereco: any): string => {
    if (!endereco || typeof endereco !== 'object') return '';
    
    const partes = [];
    if (endereco.rua) partes.push(endereco.rua);
    if (endereco.numero) partes.push(endereco.numero);
    if (endereco.cidade) partes.push(endereco.cidade);
    if (endereco.estado) partes.push(endereco.estado);
    
    return partes.length > 0 ? partes.join(', ') : '';
  };

  const formatarTelefone = (telefone?: string): string => {
    if (!telefone) return '';
    
    // Remove caracteres não numéricos
    const numeros = telefone.replace(/\D/g, '');
    
    // Aplica máscara baseada no número de dígitos
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    
    return telefone;
  };

  const handleArchive = async (id: string): Promise<boolean> => {
    try {
      await onArchive(id);
      return true;
    } catch (error) {
      console.error('[AgenciasContent] Erro ao arquivar:', error);
      return false;
    }
  };

  const handleRestore = async (id: string): Promise<boolean> => {
    try {
      await onRestore(id);
      return true;
    } catch (error) {
      console.error('[AgenciasContent] Erro ao restaurar:', error);
      return false;
    }
  };

  return (
    <div className="space-y-4">
      {agencias.map((agencia) => (
        <Card key={agencia.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Agência {agencia.numero_agencia}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {agencia.banco?.sigla ? `${agencia.banco.sigla} - ${agencia.banco?.nome}` : agencia.banco?.nome}
                    </p>
                  </div>
                </div>
                
                <div className="pl-14">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {agencia.descricao}
                  </p>
                  
                  {formatarEndereco(agencia.endereco) && (
                    <p className="text-sm text-muted-foreground mb-1">
                      📍 {formatarEndereco(agencia.endereco)}
                    </p>
                  )}
                  
                  {agencia.telefone && (
                    <p className="text-sm text-muted-foreground mb-1">
                      📞 {formatarTelefone(agencia.telefone)}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={agencia.ativo ? "default" : "secondary"}>
                      {agencia.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    
                    {agencia.deleted_at && (
                      <Badge variant="destructive">
                        Arquivado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(agencia)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(agencia)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    
                    {agencia.deleted_at ? (
                      <RestoreButton
                        onRestore={() => handleRestore(agencia.id)}
                        entityName="agência"
                        entityId={agencia.id}
                        variant="outline"
                        size="sm"
                        showText={true}
                        className="w-full justify-start font-normal"
                      />
                    ) : (
                      <ArchiveButton
                        onArchive={() => handleArchive(agencia.id)}
                        entityName="agência"
                        entityId={agencia.id}
                        variant="destructive"
                        size="sm"
                        showText={true}
                        className="w-full justify-start font-normal"
                      />
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
