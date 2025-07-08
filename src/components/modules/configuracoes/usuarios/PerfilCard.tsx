
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Edit, Trash2, Lock, AlertTriangle, Eye } from 'lucide-react';
import { Perfil } from '@/types/empresa';

interface PerfilCardProps {
  perfil: Perfil;
  onEdit: (perfil: Perfil) => void;
  onDelete: (perfil: Perfil) => void;
}

const PerfilCard: React.FC<PerfilCardProps> = ({ perfil, onEdit, onDelete }) => {
  const permissoesCriticas = [
    'financeiro.estorno', 'financeiro.lancamentoRetroativo',
    'vendas.cancelamento', 'vendas.delete',
    'estoque.ajuste', 'estoque.delete',
    'fiscal.cancelarNfe', 'fiscal.inutilizacao',
    'rh.folhaPagamento', 'rh.demissao',
    'caixa.sangria',
    'config.empresas', 'config.usuarios', 'config.sistema'
  ];
  
  const temPermissoesCriticas = perfil.permissoes.some(p => permissoesCriticas.includes(p));

  const handleEditClick = () => {
    console.log('[Perfis][Editar] Iniciando edição do perfil:', perfil.nome, 'ID:', perfil.id);
    
    console.log('[Perfis][Editar] Dados do perfil a serem editados:', {
      nome: perfil.nome,
      codigo: perfil.codigo,
      permissoes: perfil.permissoes.length,
      ativo: perfil.ativo,
      sistema: perfil.sistema
    });

    onEdit(perfil);
  };

  const handleDeleteClick = () => {
    console.log('[Perfis][Excluir] Iniciando exclusão do perfil:', perfil.nome);
    onDelete(perfil);
  };
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {perfil.nome}
              {perfil.sistema && (
                <span title="Perfil do Sistema">
                  <Lock className="w-4 h-4 text-blue-600" />
                </span>
              )}
              {temPermissoesCriticas && !perfil.sistema && (
                <span title="Contém permissões críticas">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{perfil.codigo}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={perfil.ativo ? "default" : "secondary"}>
            {perfil.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
          {perfil.sistema && (
            <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
              Sistema
            </Badge>
          )}
          <Badge variant="outline">
            {perfil.permissoes.length} permissões
          </Badge>
          {temPermissoesCriticas && (
            <Badge variant="destructive" className="text-xs">
              Críticas
            </Badge>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>{perfil.descricao}</p>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-2">Principais permissões:</p>
          <div className="flex flex-wrap gap-1">
            {perfil.permissoes.slice(0, 4).map(perm => (
              <Badge key={perm} variant="outline" className="text-xs">
                {perm}
              </Badge>
            ))}
            {perfil.permissoes.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{perfil.permissoes.length - 4}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={handleEditClick}
            className="flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors"
            title={perfil.sistema ? "Visualizar perfil do sistema" : "Editar perfil"}
          >
            {perfil.sistema ? (
              <>
                <Eye className="w-3 h-3" />
                Visualizar
              </>
            ) : (
              <>
                <Edit className="w-3 h-3" />
                Editar
              </>
            )}
          </Button>
          {!perfil.sistema && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteClick}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Excluir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerfilCard;
