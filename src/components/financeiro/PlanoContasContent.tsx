
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanoContasFilters } from './PlanoContasFilters';
import { PlanoContasTreeView } from './PlanoContasTreeView';
import { PlanoContasEmptyState } from './PlanoContasEmptyState';
import { PlanoContas } from '@/types/planoContas';

interface PlanoContasContentProps {
  filteredContas: PlanoContas[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  expandedNodes: Set<string>;
  onToggleExpansion: (nodeId: string) => void;
  onEdit: (conta: PlanoContas) => void;
  onDelete: (conta: PlanoContas) => void;
  onAddChild: (parentId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCreateClick: () => void;
}

export const PlanoContasContent: React.FC<PlanoContasContentProps> = ({
  filteredContas,
  searchTerm,
  onSearchChange,
  expandedNodes,
  onToggleExpansion,
  onEdit,
  onDelete,
  onAddChild,
  onExpandAll,
  onCollapseAll,
  onCreateClick,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estrutura Hierárquica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlanoContasFilters
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
        />

        {/* TreeView */}
        <div className="border rounded-lg p-4 min-h-[400px]">
          {filteredContas.length > 0 ? (
            <PlanoContasTreeView
              contas={filteredContas}
              expandedNodes={expandedNodes}
              onToggleExpansion={onToggleExpansion}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ) : (
            <PlanoContasEmptyState
              searchTerm={searchTerm}
              onCreateClick={onCreateClick}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
