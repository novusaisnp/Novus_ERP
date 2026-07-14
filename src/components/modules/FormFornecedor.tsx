import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Building2, User } from 'lucide-react';
import { Fornecedor, TipoPessoa } from '@/types/fornecedor';
import { consultarCEP, formatarCEP } from '@/services/cnpjApi';
import { useCnpjLookupImperative } from '@/hooks/useCnpjLookup';
import { DocumentUpload } from './DocumentUpload';
import { TelefoneManager } from './TelefoneManager';
import { DateInput } from './DateInput';
import { fornecedorUtils } from '@/utils/fornecedorUtils';
import { TipoPessoaSelector } from '@/components/modules/FormFornecedor/TipoPessoaSelector';

interface FormFornecedorProps {
  fornecedor?: Fornecedor;
  onSave: (fornecedor: Fornecedor) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

export const FormFornecedor: React.FC<FormFornecedorProps> = ({
  fornecedor,
  onSave,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<Fornecedor>({
    tipo_pessoa: 'PJ',
    // Campos PJ
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    data_fundacao: undefined,
    cnae: '',
    capital_social: undefined,
    anexos_pj: {
      contrato_social: null,
      cartao_cnpj: null,
      logotipo: null,
      portfolio_anexo: null
    },
    contato_principal: { nome: '', cargo: '' },
    referencias_comerciais: '',
    atividade_principal: '',
    prazo_entrega_habitual: '',
    responsavel_preenchimento: { nome: '', cargo: '' },
    
    // Campos PF
    nome_completo: '',
    data_nascimento: undefined,
    cpf: '',
    rg: '',
    orgao_emissor_rg: '',
    anexos_pf: {
      comprovante_residencia: null,
      copia_rg: null,
      cartao_bancario: null
    },
    referencias_pessoais: '',
    horario_atendimento: '',
    
    // Campos comuns
    email: '',
    telefone: '',
    telefones: [],
    endereco: {},
    endereco_correspondencia: {},
    usar_endereco_principal_correspondencia: true,
    dados_bancarios: { banco: '', agencia: '', conta: '', tipo_conta: 'corrente' },
    qualificacaoFiscal: {},
    ativo: true
  });

  const [loadingApi, setLoadingApi] = useState(false);
  const lookupCnpj = useCnpjLookupImperative();

  // Inicializar dados do fornecedor
  useEffect(() => {
    if (fornecedor) {
      console.log('[FormFornecedor] Carregando dados do fornecedor:', fornecedor.id, fornecedor.tipo_pessoa);
      setFormData({
        ...fornecedor,
        // Garantir que os objetos aninhados existam
        endereco: fornecedor.endereco || {},
        endereco_correspondencia: fornecedor.endereco_correspondencia || {},
        telefones: fornecedor.telefones || [],
        dados_bancarios: fornecedor.dados_bancarios || { banco: '', agencia: '', conta: '', tipo_conta: 'corrente' },
        qualificacaoFiscal: fornecedor.qualificacaoFiscal || {},
        contato_principal: fornecedor.contato_principal || { nome: '', cargo: '' },
        responsavel_preenchimento: fornecedor.responsavel_preenchimento || { nome: '', cargo: '' },
        anexos_pj: fornecedor.anexos_pj || {
          contrato_social: null,
          cartao_cnpj: null,
          logotipo: null,
          portfolio_anexo: null
        },
        anexos_pf: fornecedor.anexos_pf || {
          comprovante_residencia: null,
          copia_rg: null,
          cartao_bancario: null
        }
      });
    }
  }, [fornecedor]);

  const handleCnpjChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const formattedCnpj = fornecedorUtils.formatarCNPJ(cleanValue);
    
    setFormData(prev => ({ ...prev, cnpj: formattedCnpj }));

    if (cleanValue.length === 14) {
      setLoadingApi(true);
      try {
        console.log('[FormFornecedor] Consultando CNPJ:', cleanValue);
        const cnpjData = await lookupCnpj(cleanValue);
        if (cnpjData) {
          console.log('[FormFornecedor] Dados do CNPJ recebidos:', cnpjData.nome);
          setFormData(prev => ({
            ...prev,
            razaoSocial: cnpjData.nome || prev.razaoSocial,
            nomeFantasia: cnpjData.fantasia || prev.nomeFantasia,
            endereco: {
              ...prev.endereco,
              cep: formatarCEP(cnpjData.cep || ''),
              logradouro: cnpjData.logradouro || prev.endereco?.logradouro || '',
              numero: cnpjData.numero || prev.endereco?.numero || '',
              complemento: cnpjData.complemento || prev.endereco?.complemento || '',
              bairro: cnpjData.bairro || prev.endereco?.bairro || '',
              cidade: cnpjData.municipio || prev.endereco?.cidade || '',
              uf: cnpjData.uf || prev.endereco?.uf || ''
            },
            qualificacaoFiscal: {
              ...prev.qualificacaoFiscal,
              porte: cnpjData.porte || prev.qualificacaoFiscal?.porte || ''
            }
          }));
        }
      } catch (error) {
        console.error('[FormFornecedor] Erro ao consultar CNPJ:', error);
      } finally {
        setLoadingApi(false);
      }
    }
  };

  const handleCpfChange = (value: string) => {
    const formattedCpf = fornecedorUtils.formatarCPF(value);
    setFormData(prev => ({ ...prev, cpf: formattedCpf }));
  };

  const handleCepChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const formattedCep = formatarCEP(cleanValue);
    
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, cep: formattedCep }
    }));

    if (cleanValue.length === 8) {
      setLoadingApi(true);
      try {
        console.log('[FormFornecedor] Consultando CEP:', cleanValue);
        const cepData = await consultarCEP(cleanValue);
        if (cepData) {
          console.log('[FormFornecedor] Dados do CEP recebidos:', cepData.localidade);
          setFormData(prev => ({
            ...prev,
            endereco: {
              ...prev.endereco,
              logradouro: cepData.logradouro || prev.endereco?.logradouro || '',
              bairro: cepData.bairro || prev.endereco?.bairro || '',
              cidade: cepData.localidade || prev.endereco?.cidade || '',
              uf: cepData.uf || prev.endereco?.uf || ''
            }
          }));
        }
      } catch (error) {
        console.error('[FormFornecedor] Erro ao consultar CEP:', error);
      } finally {
        setLoadingApi(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[FormFornecedor] Enviando formulário:', formData.tipo_pessoa, formData.id ? 'UPDATE' : 'CREATE');
    console.log('[FormFornecedor] Dados do formulário:', formData);
    
    // Não limpar campos - enviar dados completos e deixar o service decidir
    const success = await onSave(formData);
    if (success) {
      onCancel();
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedFieldChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof Fornecedor] as any,
        [field]: value
      }
    }));
  };

  console.log('[FormFornecedor] Renderizando com tipo:', formData.tipo_pessoa);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seleção do Tipo de Pessoa */}
      <TipoPessoaSelector
        value={formData.tipo_pessoa}
        onChange={(value) => {
          console.log('[FormFornecedor] Alterando tipo:', value);
          setFormData(prev => ({ ...prev, tipo_pessoa: value }));
        }}
      />

      {/* Campos específicos por tipo */}
      {formData.tipo_pessoa === 'PJ' ? (
        <>
          {/* Identificação PJ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={formData.cnpj || ''}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    required
                    maxLength={18}
                  />
                  {loadingApi && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    value={formData.razaoSocial || ''}
                    onChange={(e) => handleFieldChange('razaoSocial', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    value={formData.nomeFantasia || ''}
                    onChange={(e) => handleFieldChange('nomeFantasia', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input
                    value={formData.qualificacaoFiscal?.inscricaoEstadual || ''}
                    onChange={(e) => handleNestedFieldChange('qualificacaoFiscal', 'inscricaoEstadual', e.target.value)}
                  />
                </div>

                <DateInput
                  label="Data de Fundação"
                  value={formData.data_fundacao}
                  onChange={(date) => handleFieldChange('data_fundacao', date)}
                  maxDate={new Date()}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CNAE</Label>
                  <Input
                    value={formData.cnae || ''}
                    onChange={(e) => handleFieldChange('cnae', e.target.value)}
                    placeholder="1234-5/67"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Capital Social</Label>
                  <CurrencyInput
                    value={formData.capital_social ?? 0}
                    onValueChange={(v) => handleFieldChange('capital_social', v || undefined)}
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Identificação PF */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome_completo || ''}
                  onChange={(e) => handleFieldChange('nome_completo', e.target.value)}
                  required={formData.tipo_pessoa === 'PF'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateInput
                  label="Data de Nascimento *"
                  value={formData.data_nascimento}
                  onChange={(date) => handleFieldChange('data_nascimento', date)}
                  required={formData.tipo_pessoa === 'PF'}
                  maxDate={new Date()}
                />

                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input
                    value={formData.cpf || ''}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    placeholder="000.000.000-00"
                    required={formData.tipo_pessoa === 'PF'}
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input
                    value={formData.rg || ''}
                    onChange={(e) => handleFieldChange('rg', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Órgão Emissor RG</Label>
                  <Input
                    value={formData.orgao_emissor_rg || ''}
                    onChange={(e) => handleFieldChange('orgao_emissor_rg', e.target.value)}
                    placeholder="SSP/SP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Seção Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <Input
                  id="cep"
                  value={formData.endereco?.cep || ''}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                />
                {loadingApi && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={formData.endereco?.logradouro || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  endereco: { ...formData.endereco, logradouro: e.target.value }
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.endereco?.numero || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  endereco: { ...formData.endereco, numero: e.target.value }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.endereco?.complemento || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  endereco: { ...formData.endereco, complemento: e.target.value }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.endereco?.bairro || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  endereco: { ...formData.endereco, bairro: e.target.value }
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                value={formData.endereco?.uf || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  endereco: { ...formData.endereco, uf: e.target.value.toUpperCase() }
                })}
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={formData.endereco?.cidade || ''}
              onChange={(e) => setFormData({
                ...formData,
                endereco: { ...formData.endereco, cidade: e.target.value }
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Seção Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Principal</Label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <TelefoneManager 
            telefones={formData.telefones || []}
            onChange={(telefones) => setFormData({ ...formData, telefones })}
          />

          {formData.tipo_pessoa === 'PJ' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Contato Principal</Label>
                <Input
                  value={formData.contato_principal?.nome || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    contato_principal: { ...formData.contato_principal, nome: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo do Contato Principal</Label>
                <Input
                  value={formData.contato_principal?.cargo || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    contato_principal: { ...formData.contato_principal, cargo: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção Dados Bancários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Bancárias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome do Banco</Label>
              <Input
                value={formData.dados_bancarios?.banco || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  dados_bancarios: { ...formData.dados_bancarios, banco: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={formData.dados_bancarios?.agencia || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  dados_bancarios: { ...formData.dados_bancarios, agencia: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Conta Corrente</Label>
              <Input
                value={formData.dados_bancarios?.conta || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  dados_bancarios: { ...formData.dados_bancarios, conta: e.target.value }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Anexos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.tipo_pessoa === 'PJ' ? (
            <>
              <DocumentUpload
                label="Contrato Social"
                value={formData.anexos_pj?.contrato_social}
                onChange={(value) => setFormData({
                  ...formData,
                  anexos_pj: { ...formData.anexos_pj, contrato_social: value }
                })}
                required
              />
              <DocumentUpload
                label="Cartão CNPJ"
                value={formData.anexos_pj?.cartao_cnpj}
                onChange={(value) => setFormData({
                  ...formData,
                  anexos_pj: { ...formData.anexos_pj, cartao_cnpj: value }
                })}
                required
              />
              <DocumentUpload
                label="Logotipo"
                value={formData.anexos_pj?.logotipo}
                onChange={(value) => setFormData({
                  ...formData,
                  anexos_pj: { ...formData.anexos_pj, logotipo: value }
                })}
                accept=".jpg,.jpeg,.png"
                showPreview
              />
            </>
          ) : (
            <>
              <DocumentUpload
                label="Comprovante de Residência"
                value={formData.anexos_pf?.comprovante_residencia}
                onChange={(value) => setFormData({
                  ...formData,
                  anexos_pf: { ...formData.anexos_pf, comprovante_residencia: value }
                })}
                required
              />
              <DocumentUpload
                label="Cópia do RG"
                value={formData.anexos_pf?.copia_rg}
                onChange={(value) => setFormData({
                  ...formData,
                  anexos_pf: { ...formData.anexos_pf, copia_rg: value }
                })}
                required
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Seção Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.tipo_pessoa === 'PJ' ? (
            <>
              <div className="space-y-2">
                <Label>Referências Comerciais</Label>
                <Textarea
                  value={formData.referencias_comerciais || ''}
                  onChange={(e) => setFormData({ ...formData, referencias_comerciais: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição da Atividade Principal</Label>
                <Textarea
                  value={formData.atividade_principal || ''}
                  onChange={(e) => setFormData({ ...formData, atividade_principal: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo de Entrega Habitual</Label>
                <Input
                  value={formData.prazo_entrega_habitual || ''}
                  onChange={(e) => setFormData({ ...formData, prazo_entrega_habitual: e.target.value })}
                  placeholder="Ex: 5 dias úteis"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Referências Pessoais</Label>
                <Textarea
                  value={formData.referencias_pessoais || ''}
                  onChange={(e) => setFormData({ ...formData, referencias_pessoais: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário de Atendimento</Label>
                <Input
                  value={formData.horario_atendimento || ''}
                  onChange={(e) => setFormData({ ...formData, horario_atendimento: e.target.value })}
                  placeholder="Ex: Segunda a sexta, 8h às 18h"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seção Fiscal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Qualificação Fiscal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={formData.qualificacaoFiscal?.inscricaoEstadual || ''}
                onChange={(e) => handleNestedFieldChange('qualificacaoFiscal', 'inscricaoEstadual', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
              <Input
                id="inscricao_municipal"
                value={formData.qualificacaoFiscal?.inscricaoMunicipal || ''}
                onChange={(e) => handleNestedFieldChange('qualificacaoFiscal', 'inscricaoMunicipal', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regime_tributario">Regime Tributário</Label>
              <Select
                value={formData.qualificacaoFiscal?.regimeTributario || ''}
                onValueChange={(value) => setFormData({
                  ...formData,
                  qualificacaoFiscal: {
                    ...formData.qualificacaoFiscal,
                    regimeTributario: value
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="porte">Porte da Empresa</Label>
              <Input
                id="porte"
                value={formData.qualificacaoFiscal?.porte || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  qualificacaoFiscal: {
                    ...formData.qualificacaoFiscal,
                    porte: e.target.value
                  }
                })}
                readOnly
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || loadingApi}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {fornecedor?.id ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
};
