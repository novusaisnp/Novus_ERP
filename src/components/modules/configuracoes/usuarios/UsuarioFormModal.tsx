
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usuarioService } from '@/services/usuarioService';
import { Save, X, Users } from 'lucide-react';
import { Usuario, EmpresaRepresentada, Perfil } from '@/types/empresa';
import { Colaborador } from '@/types/rh';
import { validarCPF } from '@/services/cnpjApi';
import FormUsuario from './FormUsuario';
import FormVinculoColaborador from './FormVinculoColaborador';
import FormPerfil from './FormPerfil';

interface UsuarioFormModalProps {
  isOpen: boolean;
  editingUsuario: Usuario | null;
  empresas: EmpresaRepresentada[];
  perfis: Perfil[];
  colaboradores: Colaborador[];
  usuarios: Usuario[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (usuario: Usuario) => Promise<boolean>;
}

const UsuarioFormModal: React.FC<UsuarioFormModalProps> = ({
  isOpen,
  editingUsuario,
  empresas,
  perfis,
  colaboradores,
  usuarios,
  loading,
  onClose,
  onSubmit
}) => {
  console.log('[Usuarios] UsuarioFormModal renderizando - isOpen:', isOpen);

  const { toast } = useToast();
  const [formData, setFormData] = useState<Usuario & { senhaTemporaria?: string; obrigarTrocaSenha?: boolean }>({
    empresaRepresentadaId: '',
    nomeCompleto: '',
    cpf: '',
    email: '',
    perfilId: '',
    colaboradorId: '',
    ativo: true,
    senhaTemporaria: '',
    obrigarTrocaSenha: true
  });

  // Verificar se os dados essenciais estão carregados
  const isDadosCarregados = empresas.length > 0 && perfis.length > 0 && colaboradores.length > 0;

  useEffect(() => {
    console.log('[Usuarios] useEffect - editingUsuario:', editingUsuario);
    if (editingUsuario) {
      setFormData({
        ...editingUsuario,
        senhaTemporaria: '',
        obrigarTrocaSenha: false
      });
    } else {
      setFormData({
        empresaRepresentadaId: '',
        nomeCompleto: '',
        cpf: '',
        email: '',
        perfilId: '',
        colaboradorId: '',
        ativo: true,
        senhaTemporaria: '',
        obrigarTrocaSenha: true
      });
    }
  }, [editingUsuario, isOpen]);

  const handleColaboradorChange = (colaboradorId: string) => {
    console.log('[Usuarios] Colaborador selecionado:', colaboradorId);
    
    const colaboradorSelecionado = colaboradores.find(c => c.id === colaboradorId);
    if (colaboradorSelecionado) {
      setFormData(prev => ({
        ...prev,
        colaboradorId,
        nomeCompleto: colaboradorSelecionado.nomeCompleto,
        cpf: colaboradorSelecionado.cpf,
        email: colaboradorSelecionado.emailPessoal || colaboradorSelecionado.emailCorporativo || prev.email,
        empresaRepresentadaId: colaboradorSelecionado.empresaRepresentadaId
      }));
    } else {
      setFormData(prev => ({ ...prev, colaboradorId }));
    }
  };

  const validateForm = (): boolean => {
    console.log('[Usuarios] Validando formulário...');
    
    if (!formData.colaboradorId) {
      toast({
        title: "Colaborador Obrigatório",
        description: "Por favor, selecione um colaborador para vincular ao usuário.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.nomeCompleto || formData.nomeCompleto.trim().length < 3) {
      toast({
        title: "Nome Inválido",
        description: "O nome completo deve ter pelo menos 3 caracteres.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.cpf || !validarCPF(formData.cpf)) {
      toast({
        title: "CPF Inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast({
        title: "Email Inválido",
        description: "Por favor, digite um email válido.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.empresaRepresentadaId) {
      toast({
        title: "Empresa Obrigatória",
        description: "Por favor, selecione uma empresa.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.perfilId) {
      toast({
        title: "Perfil Obrigatório",  
        description: "Por favor, selecione um perfil.",
        variant: "destructive"
      });
      return false;
    }

    if (!editingUsuario && (!formData.senhaTemporaria || formData.senhaTemporaria.length < 6)) {
      toast({
        title: "Senha Obrigatória",
        description: "Por favor, defina uma senha com pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return false;
    }

    // Verificar duplicidade de CPF
    const cpfExistente = usuarios.find(u => 
      u.cpf === formData.cpf.replace(/\D/g, '') && 
      u.id !== editingUsuario?.id
    );

    if (cpfExistente) {
      toast({
        title: "CPF Já Cadastrado",
        description: "Este CPF já está cadastrado para outro usuário.",
        variant: "destructive"
      });
      return false;
    }

    // Verificar duplicidade de email
    const emailExistente = usuarios.find(u => 
      u.email.toLowerCase() === formData.email.toLowerCase() && 
      u.id !== editingUsuario?.id
    );

    if (emailExistente) {
      toast({
        title: "Email Já Cadastrado",
        description: "Este email já está cadastrado para outro usuário.",
        variant: "destructive"
      });
      return false;
    }

    console.log('[Usuarios] Formulário válido!');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Usuarios] Submetendo formulário...');
    
    if (!validateForm()) {
      return;
    }

    const usuarioSalvar = {
      ...formData,
      cpf: formData.cpf.replace(/\D/g, ''),
      email: formData.email.toLowerCase(),
      updatedAt: new Date()
    };

    console.log('[Usuarios] Dados a salvar:', usuarioSalvar);

    try {
      const sucesso = await onSubmit(usuarioSalvar);
      if (sucesso) {
        console.log('[Usuarios] Usuário salvo com sucesso');
        onClose();
      }
    } catch (error) {
      console.error('[Usuarios] Erro ao salvar usuário:', error);
    }
  };

  // Se os dados não estão carregados, exibir mensagem de carregamento
  if (!isDadosCarregados) {
    console.log('[Usuarios] Dados ainda não carregados, exibindo loading...');
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Users className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Carregando dados do formulário...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  console.log('[Usuarios] Renderizando modal completo');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 border-gray-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">
            {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Dados do Usuário */}
            <div>
              <FormUsuario
                nomeCompleto={formData.nomeCompleto}
                cpf={formData.cpf}
                email={formData.email}
                senhaTemporaria={formData.senhaTemporaria || ''}
                obrigarTrocaSenha={formData.obrigarTrocaSenha || false}
                ativo={formData.ativo}
                isColaboradorVinculado={!!formData.colaboradorId}
                onNomeChange={(nome) => setFormData(prev => ({ ...prev, nomeCompleto: nome }))}
                onCpfChange={(cpf) => setFormData(prev => ({ ...prev, cpf }))}
                onEmailChange={(email) => setFormData(prev => ({ ...prev, email }))}
                onSenhaChange={(senha) => setFormData(prev => ({ ...prev, senhaTemporaria: senha }))}
                onObrigarTrocaSenhaChange={(obrigar) => setFormData(prev => ({ ...prev, obrigarTrocaSenha: obrigar }))}
                onAtivoChange={(ativo) => setFormData(prev => ({ ...prev, ativo }))}
              />
            </div>

            {/* Coluna Direita - Vínculos */}
            <div className="space-y-6">
              <FormVinculoColaborador
                colaboradorId={formData.colaboradorId || ''}
                empresaRepresentadaId={formData.empresaRepresentadaId}
                colaboradores={colaboradores}
                empresas={empresas}
                onColaboradorChange={handleColaboradorChange}
                onEmpresaChange={(empresaId) => setFormData(prev => ({ ...prev, empresaRepresentadaId: empresaId }))}
              />

              <FormPerfil
                perfilId={formData.perfilId}
                perfis={perfis}
                onPerfilChange={(perfilId) => setFormData(prev => ({ ...prev, perfilId }))}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? (
                <>
                  <Users className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingUsuario ? 'Atualizar' : 'Cadastrar'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UsuarioFormModal;
