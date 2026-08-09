
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Shield, Save, X, Settings, AlertTriangle, Lock, Eye } from 'lucide-react';
import { Perfil } from '@/types/empresa';
import PermissionsSelector from './PermissionsSelector';

interface PerfilFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  perfil?: Perfil | null;
  onSave: (perfil: Perfil) => void;
  loading: boolean;
  readOnly?: boolean;
}

const PerfilFormModal: React.FC<PerfilFormModalProps> = ({
  isOpen,
  onClose,
  perfil,
  onSave,
  loading,
  readOnly = false
}) => {
  const { toast } = useToast();
  const [confirmCritical, setConfirmCritical] = useState(false);
  
  const [formData, setFormData] = useState<Perfil>({
    nome: '',
    codigo: '',
    descricao: '',
    permissoes: [],
    ativo: true,
    sistema: false
  });

  useEffect(() => {
    console.log('[Perfis][Modal] Modal aberto. Perfil recebido:', perfil?.nome || 'Novo perfil', 'ReadOnly:', readOnly);
    
    if (perfil && isOpen) {
      console.log('[Perfis][Modal] Carregando dados do perfil para edição:', {
        nome: perfil.nome,
        codigo: perfil.codigo,
        permissoes: perfil.permissoes.length,
        ativo: perfil.ativo,
        sistema: perfil.sistema
      });
      
      setFormData({
        ...perfil,
        id: perfil.id
      });
    } else if (isOpen) {
      console.log('[Perfis][Modal] Iniciando novo perfil');
      setFormData({
        nome: '',
        codigo: '',
        descricao: '',
        permissoes: [],
        ativo: true,
        sistema: false
      });
    }
    setConfirmCritical(false);
  }, [perfil, isOpen, readOnly]);

  const handleInputChange = (field: string, value: any) => {
    if (readOnly) return;
    
    console.log('[Perfis][Modal] Alterando campo:', field, value);
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-gerar código baseado no nome
    if (field === 'nome' && typeof value === 'string') {
      const codigo = value.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      setFormData(prev => ({
        ...prev,
        codigo: codigo
      }));
    }
  };

  const handlePermissaoToggle = (permissao: string) => {
    if (readOnly) return;
    
    console.log('[Perfis][Modal] Toggle permissão:', permissao);
    
    setFormData(prev => {
      const permissoes = prev.permissoes.includes(permissao)
        ? prev.permissoes.filter(p => p !== permissao)
        : [...prev.permissoes, permissao];
      
      console.log('[Perfis][Modal] Permissões atualizadas. Total:', permissoes.length);
      
      return {
        ...prev,
        permissoes
      };
    });
  };

  const handleModuloToggle = (moduloPermissoes: string[]) => {
    if (readOnly) return;
    
    const todasIncluidas = moduloPermissoes.every(p => formData.permissoes.includes(p));
    
    console.log('[Perfis][Modal] Toggle módulo:', moduloPermissoes.length, 'permissões', 'todas incluídas:', todasIncluidas);
    
    setFormData(prev => {
      let novasPermissoes = [...prev.permissoes];
      
      if (todasIncluidas) {
        // Remove todas as permissões do módulo
        novasPermissoes = novasPermissoes.filter(p => !moduloPermissoes.includes(p));
        console.log('[Perfis][Modal] Removendo permissões do módulo');
      } else {
        // Adiciona todas as permissões do módulo
        moduloPermissoes.forEach(p => {
          if (!novasPermissoes.includes(p)) {
            novasPermissoes.push(p);
          }
        });
        console.log('[Perfis][Modal] Adicionando permissões do módulo');
      }
      
      console.log('[Perfis][Modal] Total de permissões após toggle do módulo:', novasPermissoes.length);
      
      return {
        ...prev,
        permissoes: novasPermissoes
      };
    });
  };

  const getPermissoesCriticas = () => {
    const permissoesCriticas = [
      'financeiro.estorno', 'financeiro.lancamentoRetroativo',
      'vendas.cancelamento', 'vendas.delete',
      'estoque.ajuste', 'estoque.delete',
      'fiscal.cancelarNfe', 'fiscal.inutilizacao',
      'rh.folhaPagamento', 'rh.demissao',
      'caixa.sangria',
      'config.empresas', 'config.usuarios', 'config.sistema'
    ];
    
    return formData.permissoes.filter(p => permissoesCriticas.includes(p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (readOnly) {
      onClose();
      return;
    }
    
    console.log('[Perfis][Modal] Salvando perfil:', formData.nome);
    
    // Validações básicas
    if (!formData.nome || formData.nome.trim().length < 3) {
      console.log('[Perfis][Modal] Erro de validação: nome muito curto');
      toast({
        title: "Nome Inválido",
        description: "O nome do perfil deve ter pelo menos 3 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.codigo || formData.codigo.trim().length < 2) {
      console.log('[Perfis][Modal] Erro de validação: código muito curto');
      toast({
        title: "Código Inválido",
        description: "O código do perfil deve ter pelo menos 2 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (formData.permissoes.length === 0) {
      console.log('[Perfis][Modal] Erro de validação: nenhuma permissão selecionada');
      toast({
        title: "Permissões Necessárias",
        description: "O perfil deve ter pelo menos uma permissão.",
        variant: "destructive"
      });
      return;
    }

    // Verificar permissões críticas
    const permissoesCriticas = getPermissoesCriticas();
    if (permissoesCriticas.length > 0 && !confirmCritical) {
      console.log('[Perfis][Modal] Aguardando confirmação para permissões críticas:', permissoesCriticas.length);
      toast({
        title: "Confirmação Necessária",
        description: `Este perfil possui ${permissoesCriticas.length} permissões críticas. Confirme que deseja prosseguir.`,
        variant: "destructive"
      });
      setConfirmCritical(true);
      return;
    }

    console.log('[Perfis][Modal] Validações OK. Preparando dados para salvamento');

    const perfilSalvar = {
      ...formData,
      nome: formData.nome.toUpperCase(),
      codigo: formData.codigo.toUpperCase(),
      updatedAt: new Date()
    };

    console.log('[Perfis][Modal] Enviando perfil para salvamento:', {
      nome: perfilSalvar.nome,
      codigo: perfilSalvar.codigo,
      permissoes: perfilSalvar.permissoes.length
    });

    onSave(perfilSalvar);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {readOnly ? (
              <>
                <Lock className="w-5 h-5 text-status-confirmed" />
                Visualizar Perfil do Sistema
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                {perfil ? 'Editar Perfil' : 'Novo Perfil'}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {readOnly && (
          <Card className="border-status-confirmed/20 bg-status-confirmed/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-status-confirmed mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-status-confirmed">Perfil do Sistema</h4>
                  <p className="text-sm text-status-confirmed/80 mt-1">
                    Este é um perfil padrão do sistema e não pode ser modificado. 
                    Você pode visualizar as permissões configuradas, mas não editá-las.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Perfil *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Nome do Perfil"
                    disabled={readOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', e.target.value.toUpperCase())}
                    placeholder="CODIGO_PERFIL"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  placeholder="Descrição detalhada do perfil e suas responsabilidades"
                  rows={3}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => handleInputChange('ativo', e.target.checked)}
                    className="rounded"
                    disabled={readOnly}
                  />
                  <Label htmlFor="ativo">Perfil Ativo</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seletor de Permissões */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permissões Detalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionsSelector
                permissoesSelecionadas={formData.permissoes}
                onPermissaoToggle={handlePermissaoToggle}
                onModuloToggle={handleModuloToggle}
                readOnly={readOnly}
              />
            </CardContent>
          </Card>

          {/* Confirmação de Permissões Críticas */}
          {!readOnly && getPermissoesCriticas().length > 0 && (
            <Card className="border-status-cancelled/20 bg-status-cancelled/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-status-cancelled mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-status-cancelled">Atenção: Permissões Críticas</h4>
                    <p className="text-sm text-status-cancelled/80 mt-1 mb-3">
                      Este perfil possui {getPermissoesCriticas().length} permissões críticas que podem 
                      afetar significativamente o sistema. Certifique-se de que apenas usuários 
                      confiáveis tenham acesso a estas funcionalidades.
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="confirmCritical"
                        checked={confirmCritical}
                        onChange={(e) => setConfirmCritical(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="confirmCritical" className="text-sm text-status-cancelled">
                        Confirmo que entendo os riscos das permissões críticas
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              {readOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button 
                type="submit" 
                disabled={loading || (getPermissoesCriticas().length > 0 && !confirmCritical)} 
                className="min-w-32"
              >
                {loading ? (
                  <>
                    <Settings className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {perfil ? 'Atualizar' : 'Cadastrar'}
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PerfilFormModal;
