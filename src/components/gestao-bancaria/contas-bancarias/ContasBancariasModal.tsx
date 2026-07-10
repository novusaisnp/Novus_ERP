
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Building2, Vault, CreditCard, Eye, EyeOff } from 'lucide-react';
import { ContaBancaria, ContaBancariaInput } from '@/types/contaBancaria';
import { useAgencias } from '@/hooks/useAgencias';

interface ContasBancariasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContaBancariaInput) => void;
  conta?: ContaBancaria;
  isSubmitting?: boolean;
}

export const ContasBancariasModal = ({
  isOpen,
  onClose,
  onSubmit,
  conta,
  isSubmitting = false,
}: ContasBancariasModalProps) => {
  const [formData, setFormData] = useState<ContaBancariaInput>({
    numero_conta: '',
    digito_verificador: '',
    tipo_conta: 'CORRENTE',
    titular: '',
    cpf_cnpj_titular: '',
    saldo_inicial: 0,
    data_abertura: new Date().toISOString().split('T')[0],
    conta_cofre: false,
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const { agencias } = useAgencias();

  const isEditing = Boolean(conta);

  useEffect(() => {
    if (conta) {
      setFormData({
        agencia_id: conta.agencia_id,
        numero_conta: conta.numero_conta,
        digito_verificador: conta.digito_verificador,
        tipo_conta: conta.tipo_conta,
        titular: conta.titular,
        cpf_cnpj_titular: conta.cpf_cnpj_titular,
        descricao_conta: conta.descricao_conta,
        saldo_inicial: conta.saldo_inicial,
        limite_credito: conta.limite_credito,
        data_abertura: conta.data_abertura,
        data_encerramento: conta.data_encerramento,
        status: conta.status,
        conta_cofre: conta.conta_cofre,
        configuracoes: conta.configuracoes,
        observacoes: conta.observacoes,
      });
    } else {
      setFormData({
        numero_conta: '',
        digito_verificador: '',
        tipo_conta: 'CORRENTE',
        titular: '',
        cpf_cnpj_titular: '',
        saldo_inicial: 0,
        data_abertura: new Date().toISOString().split('T')[0],
        conta_cofre: false,
      });
    }
    setErrors({});
  }, [conta, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.numero_conta?.trim()) {
      newErrors.numero_conta = 'Número da conta é obrigatório';
    }

    if (!formData.digito_verificador?.trim()) {
      newErrors.digito_verificador = 'Dígito verificador é obrigatório';
    }

    if (!formData.titular?.trim()) {
      newErrors.titular = 'Titular é obrigatório';
    }

    if (!formData.cpf_cnpj_titular?.trim()) {
      newErrors.cpf_cnpj_titular = 'CPF/CNPJ do titular é obrigatório';
    }

    if (!formData.conta_cofre && !formData.agencia_id) {
      newErrors.agencia_id = 'Agência é obrigatória para contas não-cofre';
    }

    if (!formData.data_abertura) {
      newErrors.data_abertura = 'Data de abertura é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (parseInt(numericValue) / 100).toFixed(2);
    return formattedValue;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" 
        onKeyDown={handleKeyDown}
        aria-describedby="modal-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.conta_cofre ? (
              <Vault className="h-5 w-5 text-purple-600" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            {isEditing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
          </DialogTitle>
          <p id="modal-description" className="text-sm text-muted-foreground">
            {isEditing 
              ? 'Edite as informações da conta bancária' 
              : 'Preencha os dados para criar uma nova conta bancária'
            }
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Conta */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/20">
            <Switch
              id="conta_cofre"
              checked={formData.conta_cofre}
              onCheckedChange={(checked) => {
                setFormData({ 
                  ...formData, 
                  conta_cofre: checked,
                  agencia_id: checked ? undefined : formData.agencia_id
                });
                if (errors.agencia_id) setErrors({ ...errors, agencia_id: '' });
              }}
              aria-describedby="conta-cofre-description"
            />
            <div className="flex-1">
              <Label htmlFor="conta_cofre" className="flex items-center gap-2">
                {formData.conta_cofre ? (
                  <Vault className="h-4 w-4 text-purple-600" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                {formData.conta_cofre ? 'Conta Cofre' : 'Conta Bancária'}
              </Label>
              <p id="conta-cofre-description" className="text-xs text-muted-foreground mt-1">
                {formData.conta_cofre 
                  ? "Conta para controle interno de caixa"
                  : "Conta vinculada a uma agência bancária"
                }
              </p>
            </div>
          </div>

          {/* Agência (apenas para contas não-cofre) */}
          {!formData.conta_cofre && (
            <div className="space-y-2">
              <Label htmlFor="agencia_id" className="flex items-center gap-1">
                Agência <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.agencia_id || ""}
                onValueChange={(value) => {
                  setFormData({ ...formData, agencia_id: value });
                  if (errors.agencia_id) setErrors({ ...errors, agencia_id: '' });
                }}
              >
                <SelectTrigger 
                  id="agencia_id"
                  className={errors.agencia_id ? 'border-destructive' : ''}
                  aria-describedby={errors.agencia_id ? 'agencia-error' : undefined}
                >
                  <SelectValue placeholder="Selecione uma agência" />
                </SelectTrigger>
                <SelectContent>
                  {agencias?.map((agencia) => (
                    <SelectItem key={agencia.id} value={agencia.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {agencia.numero_agencia} - {agencia.descricao}
                        {agencia.banco && (
                          <Badge variant="outline" className="text-xs">
                            {agencia.banco.codigo} - {agencia.banco.nome}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.agencia_id && (
                <div id="agencia-error" className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.agencia_id}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número da Conta */}
            <div className="space-y-2">
              <Label htmlFor="numero_conta" className="flex items-center gap-1">
                Número da Conta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero_conta"
                value={formData.numero_conta}
                onChange={(e) => {
                  setFormData({ ...formData, numero_conta: e.target.value });
                  if (errors.numero_conta) setErrors({ ...errors, numero_conta: '' });
                }}
                placeholder="Digite o número da conta"
                className={errors.numero_conta ? 'border-destructive' : ''}
                aria-describedby={errors.numero_conta ? 'numero-conta-error' : undefined}
                required
              />
              {errors.numero_conta && (
                <div id="numero-conta-error" className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.numero_conta}
                </div>
              )}
            </div>

            {/* Dígito Verificador */}
            <div className="space-y-2">
              <Label htmlFor="digito_verificador" className="flex items-center gap-1">
                Dígito <span className="text-destructive">*</span>
              </Label>
              <Input
                id="digito_verificador"
                value={formData.digito_verificador}
                onChange={(e) => {
                  setFormData({ ...formData, digito_verificador: e.target.value });
                  if (errors.digito_verificador) setErrors({ ...errors, digito_verificador: '' });
                }}
                placeholder="DV"
                className={errors.digito_verificador ? 'border-destructive' : ''}
                aria-describedby={errors.digito_verificador ? 'dv-error' : undefined}
                maxLength={2}
                required
              />
              {errors.digito_verificador && (
                <div id="dv-error" className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.digito_verificador}
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Conta (Select) */}
          {!formData.conta_cofre && (
            <div className="space-y-2">
              <Label htmlFor="tipo_conta">Tipo de Conta</Label>
              <Select
                value={formData.tipo_conta}
                onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
              >
                <SelectTrigger id="tipo_conta">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRENTE">Conta Corrente</SelectItem>
                  <SelectItem value="POUPANCA">Conta Poupança</SelectItem>
                  <SelectItem value="INVESTIMENTO">Conta Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Titular */}
          <div className="space-y-2">
            <Label htmlFor="titular" className="flex items-center gap-1">
              Titular <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titular"
              value={formData.titular}
              onChange={(e) => {
                setFormData({ ...formData, titular: e.target.value });
                if (errors.titular) setErrors({ ...errors, titular: '' });
              }}
              placeholder="Nome do titular da conta"
              className={errors.titular ? 'border-destructive' : ''}
              aria-describedby={errors.titular ? 'titular-error' : undefined}
              required
            />
            {errors.titular && (
              <div id="titular-error" className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.titular}
              </div>
            )}
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cpf_cnpj_titular" className="flex items-center gap-1">
              CPF/CNPJ do Titular <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cpf_cnpj_titular"
              value={formData.cpf_cnpj_titular}
              onChange={(e) => {
                setFormData({ ...formData, cpf_cnpj_titular: e.target.value });
                if (errors.cpf_cnpj_titular) setErrors({ ...errors, cpf_cnpj_titular: '' });
              }}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className={errors.cpf_cnpj_titular ? 'border-destructive' : ''}
              aria-describedby={errors.cpf_cnpj_titular ? 'cpf-cnpj-error' : undefined}
              required
            />
            {errors.cpf_cnpj_titular && (
              <div id="cpf-cnpj-error" className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.cpf_cnpj_titular}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Saldo Inicial */}
            <div className="space-y-2">
              <Label htmlFor="saldo_inicial">Saldo Inicial</Label>
              <Input
                id="saldo_inicial"
                type="number"
                step="0.01"
                value={formData.saldo_inicial}
                onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
              />
            </div>

            {/* Saldo Atual (somente leitura) */}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="saldo_atual" className="flex items-center gap-1">
                  Saldo Atual
                  <span
                    className="text-xs text-muted-foreground"
                    title="Saldo atualizado automaticamente pelas movimentações bancárias"
                  >
                    (auto)
                  </span>
                </Label>
                <Input
                  id="saldo_atual"
                  type="number"
                  step="0.01"
                  value={(conta as any)?.saldo_atual ?? 0}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Saldo atualizado automaticamente
                </p>
              </div>
            )}

            {/* Data de Abertura */}
            <div className="space-y-2">
              <Label htmlFor="data_abertura" className="flex items-center gap-1">
                Data de Abertura <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_abertura"
                type="date"
                value={formData.data_abertura}
                onChange={(e) => {
                  setFormData({ ...formData, data_abertura: e.target.value });
                  if (errors.data_abertura) setErrors({ ...errors, data_abertura: '' });
                }}
                className={errors.data_abertura ? 'border-destructive' : ''}
                aria-describedby={errors.data_abertura ? 'data-abertura-error' : undefined}
                required
              />
              {errors.data_abertura && (
                <div id="data-abertura-error" className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.data_abertura}
                </div>
              )}
            </div>
          </div>

          {/* Limite de Crédito */}
          {!formData.conta_cofre && (
            <div className="space-y-2">
              <Label htmlFor="limite_credito">Limite de Crédito</Label>
              <Input
                id="limite_credito"
                type="number"
                step="0.01"
                value={formData.limite_credito || ''}
                onChange={(e) => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || undefined })}
                placeholder="0,00"
              />
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao_conta">Descrição (Opcional)</Label>
            <Input
              id="descricao_conta"
              value={formData.descricao_conta || ''}
              onChange={(e) => setFormData({ ...formData, descricao_conta: e.target.value })}
              placeholder="Descrição adicional da conta"
            />
          </div>

          {/* Configurações Avançadas */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowConfiguracoes(!showConfiguracoes)}
              className="w-full justify-between p-2"
              aria-expanded={showConfiguracoes}
              aria-controls="configuracoes-section"
            >
              <span className="flex items-center gap-2">
                {showConfiguracoes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Configurações Avançadas
              </span>
            </Button>

            {showConfiguracoes && (
              <div id="configuracoes-section" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enviar_alertas"
                      checked={formData.configuracoes?.enviar_alertas !== false}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          configuracoes: { 
                            ...formData.configuracoes, 
                            enviar_alertas: checked 
                          }
                        })
                      }
                    />
                    <Label htmlFor="enviar_alertas">Enviar Alertas</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="controlar_limite"
                      checked={formData.configuracoes?.controlar_limite !== false}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          configuracoes: { 
                            ...formData.configuracoes, 
                            controlar_limite: checked 
                          }
                        })
                      }
                    />
                    <Label htmlFor="controlar_limite">Controlar Limite</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="permitir_saldo_negativo"
                      checked={formData.configuracoes?.permitir_saldo_negativo === true}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          configuracoes: { 
                            ...formData.configuracoes, 
                            permitir_saldo_negativo: checked 
                          }
                        })
                      }
                    />
                    <Label htmlFor="permitir_saldo_negativo">Permitir Saldo Negativo</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais sobre a conta"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  {isEditing ? 'Atualizando...' : 'Criando...'}
                </>
              ) : (
                isEditing ? 'Atualizar' : 'Criar Conta'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
