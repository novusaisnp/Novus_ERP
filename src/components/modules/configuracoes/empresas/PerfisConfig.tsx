
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { Perfil } from '@/types/empresa';
import PerfilCard from '@/components/modules/configuracoes/usuarios/PerfilCard';
import PerfilFormModal from '@/components/modules/configuracoes/usuarios/PerfilFormModal';
import PerfisEmptyState from '@/components/modules/configuracoes/usuarios/PerfisEmptyState';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface PerfisConfigProps {
  perfis: Perfil[];
  onAdd: (perfil: Perfil) => void;
  onEdit: (perfil: Perfil) => void;
  onDelete: (id: string) => void;
}

const PerfisConfig: React.FC<PerfisConfigProps> = ({ perfis, onAdd, onEdit, onDelete }) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Perfil | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    console.log('[Perfis] PerfisConfig - Perfis carregados:', perfis.length);
  }, [perfis]);

  const handleAdd = () => {
    console.log('[Perfis] Iniciando cadastro de novo perfil');
    setEditingPerfil(null);
    setIsReadOnly(false);
    setShowForm(true);
  };

  const handleEditPerfil = (perfil: Perfil) => {
    console.log('[Perfis][Editar] Recebendo solicitação de edição para perfil:', perfil.nome);

    if (perfil.sistema) {
      console.log('[Perfis][Editar] Abrindo perfil do sistema em modo somente leitura:', perfil.nome);
      setIsReadOnly(true);
      toast({
        title: "Perfil do Sistema",
        description: "Este perfil será aberto em modo somente leitura.",
        variant: "default"
      });
    } else {
      console.log('[Perfis][Editar] Abrindo modal de edição para perfil customizado:', {
        id: perfil.id,
        nome: perfil.nome,
        permissoes: perfil.permissoes.length
      });
      setIsReadOnly(false);
    }

    setEditingPerfil(perfil);
    setShowForm(true);
  };

  const handleDeletePerfil = (perfil: Perfil) => {
    console.log('[Perfis][Excluir] Recebendo solicitação de exclusão para perfil:', perfil.nome);

    if (perfil.sistema) {
      console.log('[Perfis][Excluir] Bloqueando exclusão de perfil do sistema:', perfil.nome);
      toast({
        title: "Perfil do Sistema", 
        description: "Perfis do sistema não podem ser excluídos.",
        variant: "destructive"
      });
      return;
    }

    if (!perfil.id) {
      console.log('[Perfis][Excluir] Erro: perfil sem ID válido');
      return;
    }
    
    console.log('[Perfis][Excluir] Confirmando exclusão do perfil:', perfil.nome);
    setConfirmingDelete(perfil);
  };

  const confirmDeleteExecute = () => {
    const perfil = confirmingDelete;
    setConfirmingDelete(null);
    if (!perfil?.id) return;
    onDelete(perfil.id);
    toast({
      title: 'Perfil Excluído',
      description: 'O perfil foi excluído com sucesso.',
    });
  };


  const handleSave = async (perfilData: Perfil) => {
    console.log('[Perfis][Salvar] Iniciando salvamento do perfil:', perfilData.nome);
    setLoading(true);

    try {
      // Verificar duplicidade de código
      const codigoExistente = perfis.find(p => 
        p.codigo === perfilData.codigo && 
        p.id !== editingPerfil?.id
      );

      if (codigoExistente) {
        console.log('[Perfis][Salvar] Erro: código duplicado encontrado:', perfilData.codigo);
        toast({
          title: "Código Já Existe",
          description: "Este código já está sendo usado por outro perfil.",
          variant: "destructive"
        });
        return;
      }

      if (editingPerfil) {
        console.log('[Perfis][Salvar] Atualizando perfil existente:', editingPerfil.id);
        onEdit(perfilData);
        toast({
          title: "Perfil Atualizado",
          description: "O perfil foi atualizado com sucesso.",
        });
      } else {
        console.log('[Perfis][Salvar] Criando novo perfil');
        onAdd(perfilData);
        toast({
          title: "Perfil Cadastrado",
          description: "O perfil foi cadastrado com sucesso.",
        });
      }

      console.log('[Perfis][Salvar] Fechando modal após salvamento bem-sucedido');
      setShowForm(false);
      setEditingPerfil(null);
      setIsReadOnly(false);
    } catch (error) {
      console.error('[Perfis][Salvar] Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o perfil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    console.log('[Perfis][Modal] Fechando modal de edição');
    setShowForm(false);
    setEditingPerfil(null);
    setIsReadOnly(false);
  };

  // Separar perfis do sistema dos customizados para exibição
  const perfisCustomizados = perfis.filter(p => !p.sistema);
  const perfisSistema = perfis.filter(p => p.sistema);
  const todosPerfis = [...perfisSistema, ...perfisCustomizados];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Perfis do Sistema</h2>
          <p className="text-muted-foreground">Configure os perfis de acesso e suas permissões detalhadas</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Perfil
        </Button>
      </div>

      {/* Lista de Perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {todosPerfis.map((perfil) => (
          <PerfilCard
            key={perfil.id}
            perfil={perfil}
            onEdit={handleEditPerfil}
            onDelete={handleDeletePerfil}
          />
        ))}

        {perfis.length === 0 && (
          <PerfisEmptyState onAdd={handleAdd} />
        )}
      </div>

      {/* Modal de Formulário */}
      <PerfilFormModal
        isOpen={showForm}
        onClose={handleCloseModal}
        perfil={editingPerfil}
        onSave={handleSave}
        loading={loading}
        readOnly={isReadOnly}
      />
    </div>
  );
};

export default PerfisConfig;
