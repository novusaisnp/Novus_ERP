
import React from 'react';
import { TreeView, TreeNode } from '@/components/ui/tree-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, FileText, Folder } from 'lucide-react';
import { PlanoContas } from '@/types/planoContas';

interface PlanoContasTreeViewProps {
  contas: PlanoContas[];
  expandedNodes: Set<string>;
  onToggleExpansion: (nodeId: string) => void;
  onEdit: (conta: PlanoContas) => void;
  onDelete: (conta: PlanoContas) => void;
  onAddChild: (parentId: string) => void;
}

export const PlanoContasTreeView: React.FC<PlanoContasTreeViewProps> = ({
  contas,
  expandedNodes,
  onToggleExpansion,
  onEdit,
  onDelete,
  onAddChild,
}) => {
  const renderConta = (conta: PlanoContas, level = 0) => {
    const hasChildren = conta.filhos && conta.filhos.length > 0;
    const isExpanded = expandedNodes.has(conta.id);

    const actions = (
      <div className="flex items-center gap-1">
        {conta.nivel < 5 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(conta.id);
            }}
            className="h-8 w-8 p-0"
            title="Adicionar subconta"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(conta);
          }}
          className="h-8 w-8 p-0"
          title="Editar conta"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conta);
          }}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          title="Excluir conta"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );

    const labelContent = (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Ícone da conta baseado no tipo analítica/sintética */}
        <div title={conta.analitica ? "Conta Analítica" : "Conta Sintética"}>
          {conta.analitica ? (
            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-600 flex-shrink-0" />
          )}
        </div>
        
        <span className="font-mono text-sm text-muted-foreground">
          {conta.codigo}
        </span>
        <span className="font-medium truncate">
          {conta.nome}
        </span>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge 
            variant={conta.tipo === 'RECEITA' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {conta.tipo}
          </Badge>
          
          <Badge 
            variant={conta.analitica ? 'outline' : 'secondary'}
            className="text-xs"
          >
            {conta.analitica ? 'Analítica' : 'Sintética'}
          </Badge>
          
          {!conta.ativo && (
            <Badge variant="destructive" className="text-xs">
              Inativa
            </Badge>
          )}
        </div>
      </div>
    );

    return (
      <div key={conta.id}>
        <TreeNode
          id={conta.id}
          label={labelContent}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onToggle={() => hasChildren && onToggleExpansion(conta.id)}
          level={level}
          actions={actions}
        />
        {isExpanded && hasChildren && (
          <div>
            {conta.filhos!.map(filho => renderConta(filho, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <TreeView>
      {contas.map(conta => renderConta(conta))}
    </TreeView>
  );
};
