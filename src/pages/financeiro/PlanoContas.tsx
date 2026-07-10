
import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanoContas } from '@/hooks/usePlanoContas';
import { PlanoContasModal } from '@/components/financeiro/PlanoContasModal';
import { PlanoContasHeader } from '@/components/financeiro/PlanoContasHeader';
import { PlanoContasStats } from '@/components/financeiro/PlanoContasStats';
import { PlanoContasContent } from '@/components/financeiro/PlanoContasContent';
import { PlanoContas as PlanoContasType, PlanoContasInput } from '@/types/planoContas';

const PlanoContas = () => {
  const {
    contas,
    contasHierarquicas,
    isLoading,
    expandedNodes,
    createConta,
    updateConta,
    deleteConta,
    isCreating,
    isUpdating,
    toggleExpansion,
    expandAll,
    collapseAll,
  } = usePlanoContas();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<PlanoContasType | undefined>();
  const [parentId, setParentId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');


  const handleCreate = () => {
    setEditingConta(undefined);
    setParentId(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (conta: PlanoContasType) => {
    setEditingConta(conta);
    setParentId(undefined);
    setIsModalOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingConta(undefined);
    setParentId(parentId);
    setIsModalOpen(true);
  };

  const handleDelete = (conta: PlanoContasType) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${conta.nome}"?`)) {
      deleteConta(conta.id);
    }
  };

  const handleSubmit = async (data: PlanoContasInput): Promise<void> => {
    try {
      const dataWithParent = { ...data, id_pai: parentId || data.id_pai };
      
      if (editingConta) {
        await updateConta({ id: editingConta.id, data: dataWithParent });
      } else {
        await createConta(dataWithParent);
      }
      
      // Só fechar o modal após sucesso confirmado
      setIsModalOpen(false);
      setParentId(undefined);
      setEditingConta(undefined);
    } catch (error) {
      // O erro já foi tratado pelo hook, propagar para manter o modal aberto
      throw error;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setParentId(undefined);
    setEditingConta(undefined);
  };

  const contasReceita = contas.filter(c => c.tipo === 'RECEITA').length;
  const contasDespesa = contas.filter(c => c.tipo === 'DESPESA').length;
  const contasAtivas = contas.filter(c => c.ativo).length;
  const contasAnaliticas = contas.filter(c => c.analitica).length;
  const contasSinteticas = contas.filter(c => !c.analitica).length;

  const filteredContas = searchTerm
    ? contasHierarquicas.filter(conta => 
        conta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conta.codigo.includes(searchTerm)
      )
    : contasHierarquicas;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PlanoContasHeader onCreateClick={handleCreate} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-primary">{contas.length}</div>
          <div className="text-sm text-muted-foreground">Total de Contas</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{contasReceita}</div>
          <div className="text-sm text-muted-foreground">Receitas</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-red-600">{contasDespesa}</div>
          <div className="text-sm text-muted-foreground">Despesas</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{contasAnaliticas}</div>
          <div className="text-sm text-muted-foreground">Analíticas</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold text-amber-600">{contasSinteticas}</div>
          <div className="text-sm text-muted-foreground">Sintéticas</div>
        </div>
      </div>

      <PlanoContasContent
        filteredContas={filteredContas}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        expandedNodes={expandedNodes}
        onToggleExpansion={toggleExpansion}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onCreateClick={handleCreate}
      />

      <PlanoContasModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
        conta={editingConta}
        contas={contas}
        parentId={parentId}
      />
    </div>
  );
};

export default PlanoContas;
