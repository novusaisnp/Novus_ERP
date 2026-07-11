import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { Usuario, EmpresaRepresentada, Perfil } from '@/types/empresa';
import { Colaborador } from '@/types/rh';
import UsuarioCard from '../usuarios/UsuarioCard';
import UsuarioFilters from '../usuarios/UsuarioFilters';
import UsuarioFormModal from '../usuarios/UsuarioFormModal';
import UsuarioEmptyState from '../usuarios/UsuarioEmptyState';
import UsuarioLoadingState from '../usuarios/UsuarioLoadingState';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface UsuariosVinculadosListProps {
  usuarios: Usuario[];
  empresas: EmpresaRepresentada[];
  perfis: Perfil[];
  colaboradores: Colaborador[];
  onAdd: (usuario: Usuario) => Promise<boolean>;
  onEdit: (usuario: Usuario) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const UsuariosVinculadosList: React.FC<UsuariosVinculadosListProps> = ({
  usuarios,
  empresas,
  perfis,
  colaboradores,
  onAdd,
  onEdit,
  onDelete
}) => {
  console.log('[Usuarios] UsuariosVinculadosList renderizando');
  console.log('[Usuarios] Dados recebidos - usuários:', usuarios.length, 'empresas:', empresas.length, 'perfis:', perfis.length, 'colaboradores:', colaboradores.length);

  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('');
  const [confirmingDelete, setConfirmingDelete] = useState<Usuario | null>(null);

  // Verificar se dados essenciais estão carregados
  const isDadosCarregados = empresas.length > 0 && perfis.length > 0 && colaboradores.length > 0;

  // Filtrar usuários
  const usuariosFiltrados = usuarios.filter(usuario => {
    const filtroEmpresaMatch = !filtroEmpresa || usuario.empresaRepresentadaId === filtroEmpresa;
    const filtroPerfilMatch = !filtroPerfil || usuario.perfilId === filtroPerfil;
    return filtroEmpresaMatch && filtroPerfilMatch;
  });

  const handleAdd = () => {
    if (!isDadosCarregados) {
      console.log('[Usuarios] Dados não carregados ainda');
      toast({
        title: "Dados não carregados",
        description: "Aguarde o carregamento das empresas e perfis.",
        variant: "destructive"
      });
      return;
    }

    console.log('[Usuarios] Iniciando cadastro de novo usuário');
    setEditingUsuario(null);
    setShowForm(true);
  };

  const handleEdit = (usuario: Usuario) => {
    if (!isDadosCarregados) {
      console.log('[Usuarios] Dados não carregados ainda');
      toast({
        title: "Dados não carregados",
        description: "Aguarde o carregamento das empresas e perfis.",
        variant: "destructive"
      });
      return;
    }

    console.log('[Usuarios] Editando usuário:', usuario.nomeCompleto);
    setEditingUsuario(usuario);
    setShowForm(true);
  };

  const handleDelete = async (usuario: Usuario) => {
    if (!usuario.id) return;
    setConfirmingDelete(usuario);
  };

  const confirmDelete = async () => {
    const usuario = confirmingDelete;
    if (!usuario?.id) return;
    setConfirmingDelete(null);
    try {
      const sucesso = await onDelete(usuario.id);
      if (sucesso) {
        toast({
          title: 'Usuário Excluído',
          description: 'O usuário foi excluído com sucesso.',
        });
      }
    } catch (error) {
      console.error('[Usuarios] Erro ao excluir:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Ocorreu um erro ao excluir o usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleFormSubmit = async (usuarioData: Usuario): Promise<boolean> => {
    console.log('[Usuarios] Submetendo formulário de usuário');
    setLoading(true);

    try {
      let sucesso = false;
      
      if (editingUsuario) {
        console.log('[Usuarios] Atualizando usuário existente');
        sucesso = await onEdit(usuarioData);
        if (sucesso) {
          toast({
            title: "Usuário Atualizado",
            description: "Os dados do usuário foram atualizados com sucesso.",
          });
        }
      } else {
        console.log('[Usuarios] Criando novo usuário');
        sucesso = await onAdd(usuarioData);
        if (sucesso) {
          toast({
            title: "Usuário Cadastrado",
            description: "O usuário foi cadastrado com sucesso.",
          });
        }
      }

      if (sucesso) {
        setShowForm(false);
        setEditingUsuario(null);
      }

      return sucesso;
    } catch (error) {
      console.error('[Usuarios] Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os dados do usuário.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    console.log('[Usuarios] Fechando modal');
    setShowForm(false);
    setEditingUsuario(null);
    setLoading(false);
  };

  // Mostrar loading se os dados não estão carregados
  if (!isDadosCarregados) {
    console.log('[Usuarios] Exibindo estado de loading');
    return <UsuarioLoadingState />;
  }

  console.log('[Usuarios] Renderizando lista completa de usuários');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">Usuários Vinculados</h2>
          <p className="text-muted-foreground">Gerencie os usuários e seus acessos ao sistema</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Filtros */}
      <UsuarioFilters
        empresas={empresas}
        perfis={perfis}
        filtroEmpresa={filtroEmpresa}
        filtroPerfil={filtroPerfil}
        usuariosCount={usuariosFiltrados.length}
        onFiltroEmpresaChange={setFiltroEmpresa}
        onFiltroPerfilChange={setFiltroPerfil}
      />

      {/* Lista de Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuariosFiltrados.map((usuario) => (
          <UsuarioCard
            key={usuario.id}
            usuario={usuario}
            empresas={empresas}
            perfis={perfis}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}

        {usuariosFiltrados.length === 0 && (
          <UsuarioEmptyState
            hasUsuarios={usuarios.length > 0}
            onAddUsuario={handleAdd}
          />
        )}
      </div>

      {/* Modal de Formulário */}
      <UsuarioFormModal
        isOpen={showForm}
        editingUsuario={editingUsuario}
        empresas={empresas}
        perfis={perfis}
        colaboradores={colaboradores}
        usuarios={usuarios}
        loading={loading}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default UsuariosVinculadosList;
