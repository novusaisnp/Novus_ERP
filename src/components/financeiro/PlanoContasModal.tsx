
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Folder } from 'lucide-react';
import { PlanoContas, PlanoContasInput } from '@/types/planoContas';

interface PlanoContasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PlanoContasInput) => Promise<void>;
  isLoading?: boolean;
  conta?: PlanoContas;
  contas: PlanoContas[];
  parentId?: string;
}

export const PlanoContasModal: React.FC<PlanoContasModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  conta,
  contas,
  parentId,
}) => {
  const [formData, setFormData] = useState<PlanoContasInput>({
    nome: '',
    tipo: 'RECEITA',
    ativo: true,
    analitica: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isEditing = Boolean(conta);
  const parentConta = parentId ? contas.find(c => c.id === parentId) : null;

  useEffect(() => {
    if (conta) {
      setFormData({
        nome: conta.nome,
        tipo: conta.tipo,
        id_pai: conta.id_pai,
        ativo: conta.ativo,
        analitica: conta.analitica,
      });
    } else {
      // Ao criar nova conta, herdar tipo da conta pai se disponível
      setFormData({
        nome: '',
        tipo: parentConta ? parentConta.tipo : 'RECEITA',
        id_pai: parentId,
        ativo: true,
        analitica: Boolean(parentId), // Subcontas começam analíticas
      });
    }
    setErrors({});
  }, [conta, parentId, parentConta, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Nome da conta é obrigatório';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo da conta é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('[PlanoContasModal] Enviando formulário:', formData);
      await onSubmit(formData);
      // O modal será fechado pelo componente pai após sucesso
    } catch (error) {
      console.error('[PlanoContasModal] Erro no submit:', error);
      // O erro já foi tratado pelo hook, não fechar o modal
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const contasPossiveis = contas.filter(c => 
    c.nivel < 5 && // Não pode ter mais de 5 níveis
    (!conta || c.id !== conta.id) // Não pode ser pai de si mesma
  );

  const temFilhos = conta && contas.some(c => c.id_pai === conta.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <FileText className="h-5 w-5" />
                Editar Conta
              </>
            ) : (
              <>
                <Folder className="h-5 w-5" />
                Nova Conta
                {parentConta && (
                  <Badge variant="outline" className="ml-2">
                    Subconta de: {parentConta.nome}
                  </Badge>
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              Nome da Conta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => {
                setFormData({ ...formData, nome: e.target.value });
                if (errors.nome) setErrors({ ...errors, nome: '' });
              }}
              placeholder="Digite o nome da conta"
              className={errors.nome ? 'border-destructive' : ''}
              autoFocus
              required
            />
            {errors.nome && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.nome}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo" className="flex items-center gap-1">
              Tipo <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.tipo}
              onValueChange={(value: 'RECEITA' | 'DESPESA') => {
                setFormData({ ...formData, tipo: value });
                if (errors.tipo) setErrors({ ...errors, tipo: '' });
              }}
            >
              <SelectTrigger className={errors.tipo ? 'border-destructive' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEITA">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">RECEITA</Badge>
                    Receita
                  </div>
                </SelectItem>
                <SelectItem value="DESPESA">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">DESPESA</Badge>
                    Despesa
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.tipo}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_pai">Conta Pai (Opcional)</Label>
            <Select
              value={formData.id_pai || "root"}
              onValueChange={(value) => 
                setFormData({ 
                  ...formData, 
                  id_pai: value === "root" ? undefined : value,
                  // Subcontas começam analíticas por padrão
                  analitica: value !== "root" ? true : formData.analitica
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta pai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Nenhuma (Conta Raiz)</SelectItem>
                {contasPossiveis.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      {c.analitica ? <FileText className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                      {c.codigo} - {c.nome}
                      <Badge variant={c.analitica ? "default" : "secondary"} className="text-xs">
                        {c.analitica ? "Analítica" : "Sintética"}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center space-x-2">
              <Switch
                id="analitica"
                checked={formData.analitica}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, analitica: checked })
                }
                disabled={temFilhos} // Não pode alterar se tem filhos
              />
              <div className="flex-1">
                <Label htmlFor="analitica" className="flex items-center gap-2">
                  {formData.analitica ? <FileText className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  Conta Analítica
                </Label>
                {temFilhos && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Esta conta possui subcontas e deve permanecer sintética
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                {formData.analitica ? "📄 Conta Analítica" : "📁 Conta Sintética"}
              </p>
              <p>
                {formData.analitica 
                  ? "Pode receber lançamentos contábeis diretamente"
                  : "Serve apenas para agrupar outras contas (não recebe lançamentos)"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, ativo: checked })
              }
            />
            <Label htmlFor="ativo">Conta Ativa</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Salvando...
                </>
              ) : (
                isEditing ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
