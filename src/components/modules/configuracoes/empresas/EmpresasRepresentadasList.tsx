
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building, Plus, Edit, Trash2, Upload, Search, Loader2, FileImage, CheckCircle, XCircle } from 'lucide-react';
import { EmpresaRepresentada } from '@/types/empresa';
import { consultarCNPJ, consultarCEP, validarCNPJ, formatarCNPJ, formatarCEP } from '@/services/cnpjApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmpresasRepresentadasListProps {
  empresas: EmpresaRepresentada[];
  onAdd: (empresa: EmpresaRepresentada) => void;
  onEdit: (empresa: EmpresaRepresentada) => void;
  onDelete: (id: string) => void;
  empresaResponsavelId: string;
}

const EmpresasRepresentadasList: React.FC<EmpresasRepresentadasListProps> = ({
  empresas,
  onAdd,
  onEdit,
  onDelete,
  empresaResponsavelId
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaRepresentada | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState<EmpresaRepresentada>({
    empresaResponsavelId,
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: ''
    },
    qualificacaoFiscal: {
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      regimeTributario: 'SIMPLES_NACIONAL',
      porte: 'ME'
    },
    configuracaoNF: {
      ambiente: 'HOMOLOGACAO',
      numeracaoNFe: 1,
      numeracaoNFCe: 1
    },
    ativa: true
  });

  const resetForm = () => {
    setFormData({
      empresaResponsavelId,
      cnpj: '',
      razaoSocial: '',
      nomeFantasia: '',
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: ''
      },
      qualificacaoFiscal: {
        inscricaoEstadual: '',
        inscricaoMunicipal: '',
        regimeTributario: 'SIMPLES_NACIONAL',
        porte: 'ME'
      },
      configuracaoNF: {
        ambiente: 'HOMOLOGACAO',
        numeracaoNFe: 1,
        numeracaoNFCe: 1
      },
      ativa: true
    });
    setEditingEmpresa(null);
  };

  const handleAdd = () => {
    console.log('[EmpresasRepresentadas]', 'Iniciando cadastro de nova empresa');
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (empresa: EmpresaRepresentada) => {
    console.log('[EmpresasRepresentadas]', 'Editando empresa:', empresa);
    setFormData(empresa);
    setEditingEmpresa(empresa);
    setShowForm(true);
  };

  const handleInputChange = (field: string, value: any, subField?: string, subSubField?: string) => {
    console.log('[EmpresasRepresentadas]', 'Alterando campo:', field, subField, subSubField, value);
    
    setFormData(prev => {
      if (subSubField) {
        return {
          ...prev,
          [field]: {
            ...prev[field as keyof EmpresaRepresentada] as any,
            [subField as string]: {
              ...(prev[field as keyof EmpresaRepresentada] as any)[subField as string],
              [subSubField]: value
            }
          }
        };
      } else if (subField) {
        return {
          ...prev,
          [field]: {
            ...prev[field as keyof EmpresaRepresentada] as any,
            [subField]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const buscarDadosCNPJ = async () => {
    if (!formData.cnpj || !validarCNPJ(formData.cnpj)) {
      toast({
        title: "CNPJ Inválido",
        description: "Por favor, digite um CNPJ válido.",
        variant: "destructive"
      });
      return;
    }

    setLoadingCNPJ(true);
    console.log('[EmpresasRepresentadas]', 'Buscando dados do CNPJ:', formData.cnpj);

    try {
      const dados = await consultarCNPJ(formData.cnpj);
      
      if (dados) {
        setFormData(prev => ({
          ...prev,
          razaoSocial: dados.nome,
          nomeFantasia: dados.fantasia || dados.nome,
          endereco: {
            ...prev.endereco,
            cep: dados.cep,
            logradouro: dados.logradouro,
            numero: dados.numero || '',
            complemento: dados.complemento || '',
            bairro: dados.bairro,
            cidade: dados.municipio,
            uf: dados.uf
          }
        }));

        toast({
          title: "Dados Carregados",
          description: "Informações do CNPJ foram preenchidas automaticamente.",
        });
      } else {
        toast({
          title: "CNPJ não encontrado",
          description: "Não foi possível encontrar os dados deste CNPJ.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[EmpresasRepresentadas]', 'Erro ao buscar CNPJ:', error);
      toast({
        title: "Erro na consulta",
        description: "Erro ao consultar os dados do CNPJ.",
        variant: "destructive"
      });
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const buscarCEP = async () => {
    if (!formData.endereco.cep || formData.endereco.cep.replace(/\D/g, '').length !== 8) {
      toast({
        title: "CEP Inválido",
        description: "Por favor, digite um CEP válido.",
        variant: "destructive"
      });
      return;
    }

    setLoadingCEP(true);
    console.log('[EmpresasRepresentadas]', 'Buscando dados do CEP:', formData.endereco.cep);

    try {
      const dados = await consultarCEP(formData.endereco.cep);
      
      if (dados) {
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            logradouro: dados.logradouro,
            bairro: dados.bairro,
            cidade: dados.localidade,
            uf: dados.uf,
            complemento: dados.complemento || prev.endereco.complemento
          }
        }));

        toast({
          title: "CEP Encontrado",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível encontrar este CEP.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[EmpresasRepresentadas]', 'Erro ao buscar CEP:', error);
      toast({
        title: "Erro na consulta",
        description: "Erro ao consultar o CEP.",
        variant: "destructive"
      });
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[EmpresasRepresentadas]', 'Upload de logomarca:', file);

    // Validar tipo de arquivo
    const allowedTypes = ['image/bmp', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato Inválido",
        description: "A logomarca deve ser um arquivo BMP ou JPEG.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo Muito Grande",
        description: "A logomarca deve ter no máximo 2MB.",
        variant: "destructive"
      });
      return;
    }

    setUploadingLogo(true);

    try {
      // Simular upload - em produção seria enviado ao backend
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoData = {
          url: e.target?.result as string,
          filename: file.name
        };

        setFormData(prev => ({
          ...prev,
          logomarca: logoData
        }));

        toast({
          title: "Logomarca Carregada",
          description: "A logomarca foi adicionada com sucesso.",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('[EmpresasRepresentadas]', 'Erro no upload:', error);
      toast({
        title: "Erro no Upload",
        description: "Erro ao fazer upload da logomarca.",
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[EmpresasRepresentadas]', 'Salvando empresa representada:', formData);
    
    // Validações
    if (!formData.cnpj || !validarCNPJ(formData.cnpj)) {
      toast({
        title: "CNPJ Inválido",
        description: "Por favor, digite um CNPJ válido.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.razaoSocial || formData.razaoSocial.trim().length < 3) {
      toast({
        title: "Razão Social Inválida",
        description: "A razão social deve ter pelo menos 3 caracteres.",
        variant: "destructive"
      });
      return;
    }

    // Verificar duplicidade de CNPJ
    const cnpjExistente = empresas.find(e => 
      e.cnpj === formData.cnpj.replace(/\D/g, '') && 
      e.id !== editingEmpresa?.id
    );

    if (cnpjExistente) {
      toast({
        title: "CNPJ Já Cadastrado",
        description: "Este CNPJ já está cadastrado em outra empresa.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const empresaSalvar = {
        ...formData,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        endereco: {
          ...formData.endereco,
          cep: formData.endereco.cep.replace(/\D/g, '')
        },
        updatedAt: new Date()
      };

      if (editingEmpresa) {
        onEdit(empresaSalvar);
        toast({
          title: "Empresa Atualizada",
          description: "Os dados da empresa foram atualizados com sucesso.",
        });
      } else {
        onAdd(empresaSalvar);
        toast({
          title: "Empresa Cadastrada",
          description: "A empresa representada foi cadastrada com sucesso.",
        });
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('[EmpresasRepresentadas]', 'Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (empresa: EmpresaRepresentada) => {
    if (!empresa.id) return;
    
    console.log('[EmpresasRepresentadas]', 'Excluindo empresa:', empresa);
    
    if (window.confirm(`Tem certeza que deseja excluir a empresa ${empresa.razaoSocial}?`)) {
      onDelete(empresa.id);
      toast({
        title: "Empresa Excluída",
        description: "A empresa foi excluída com sucesso.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Empresas Representadas</h2>
          <p className="text-muted-foreground">Gerencie as empresas representadas pela sua organização</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Lista de Empresas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empresas.map((empresa) => (
          <Card key={empresa.id} className="hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{empresa.razaoSocial}</CardTitle>
                  <p className="text-sm text-muted-foreground">{formatarCNPJ(empresa.cnpj)}</p>
                </div>
                {empresa.logomarca && (
                  <img 
                    src={empresa.logomarca.url} 
                    alt="Logo" 
                    className="w-12 h-12 object-cover rounded border"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={empresa.ativa ? "default" : "secondary"}>
                  {empresa.ativa ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ativa
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Inativa
                    </>
                  )}
                </Badge>
                <Badge variant="outline">
                  {empresa.qualificacaoFiscal.regimeTributario}
                </Badge>
                <Badge variant="outline">
                  {empresa.configuracaoNF.ambiente}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{empresa.nomeFantasia}</p>
                <p>{empresa.endereco.cidade}/{empresa.endereco.uf}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(empresa)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(empresa)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {empresas.length === 0 && (
          <div className="col-span-full">
            <Card className="p-8 text-center">
              <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma empresa representada</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre as empresas que sua organização representa
              </p>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeira Empresa
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmpresa ? 'Editar Empresa Representada' : 'Nova Empresa Representada'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CNPJ */}
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <div className="flex gap-2">
                <Input
                  id="cnpj"
                  value={formatarCNPJ(formData.cnpj)}
                  onChange={(e) => handleInputChange('cnpj', e.target.value.replace(/\D/g, ''))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={buscarDadosCNPJ}
                  disabled={loadingCNPJ || !formData.cnpj}
                  variant="outline"
                  size="icon"
                >
                  {loadingCNPJ ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="razaoSocial">Razão Social *</Label>
                <Input
                  id="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={(e) => handleInputChange('razaoSocial', e.target.value)}
                  placeholder="Razão Social da Empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  value={formData.nomeFantasia}
                  onChange={(e) => handleInputChange('nomeFantasia', e.target.value)}
                  placeholder="Nome Fantasia"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Endereço</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={formatarCEP(formData.endereco.cep)}
                      onChange={(e) => handleInputChange('endereco', e.target.value.replace(/\D/g, ''), 'cep')}
                      placeholder="00000-000"
                      maxLength={9}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={buscarCEP}
                      disabled={loadingCEP || !formData.endereco.cep}
                      variant="outline"
                      size="icon"
                    >
                      {loadingCEP ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="logradouro">Logradouro *</Label>
                  <Input
                    id="logradouro"
                    value={formData.endereco.logradouro}
                    onChange={(e) => handleInputChange('endereco', e.target.value, 'logradouro')}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    value={formData.endereco.numero}
                    onChange={(e) => handleInputChange('endereco', e.target.value, 'numero')}
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.endereco.complemento}
                    onChange={(e) => handleInputChange('endereco', e.target.value, 'complemento')}
                    placeholder="Apt, Sala, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input
                    id="bairro"
                    value={formData.endereco.bairro}
                    onChange={(e) => handleInputChange('endereco', e.target.value, 'bairro')}
                    placeholder="Nome do Bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf">UF *</Label>
                  <Input
                    id="uf"
                    value={formData.endereco.uf}
                    onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase(), 'uf')}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  value={formData.endereco.cidade}
                  onChange={(e) => handleInputChange('endereco', e.target.value, 'cidade')}
                  placeholder="Nome da Cidade"
                />
              </div>
            </div>

            {/* Qualificação Fiscal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Qualificação Fiscal</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                  <Input
                    id="inscricaoEstadual"
                    value={formData.qualificacaoFiscal.inscricaoEstadual || ''}
                    onChange={(e) => handleInputChange('qualificacaoFiscal', e.target.value, 'inscricaoEstadual')}
                    placeholder="000.000.000.000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
                  <Input
                    id="inscricaoMunicipal"
                    value={formData.qualificacaoFiscal.inscricaoMunicipal || ''}
                    onChange={(e) => handleInputChange('qualificacaoFiscal', e.target.value, 'inscricaoMunicipal')}
                    placeholder="000000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regimeTributario">Regime Tributário *</Label>
                  <Select
                    value={formData.qualificacaoFiscal.regimeTributario}
                    onValueChange={(value: any) => handleInputChange('qualificacaoFiscal', value, 'regimeTributario')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                      <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                      <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="porte">Porte da Empresa *</Label>
                  <Select
                    value={formData.qualificacaoFiscal.porte}
                    onValueChange={(value: any) => handleInputChange('qualificacaoFiscal', value, 'porte')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="MEI">MEI - Microempreendedor Individual</SelectItem>
                      <SelectItem value="ME">ME - Microempresa</SelectItem>
                      <SelectItem value="EPP">EPP - Empresa de Pequeno Porte</SelectItem>
                      <SelectItem value="DEMAIS">Demais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Logomarca */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Logomarca</h3>
              
              <div className="space-y-2">
                <Label>Logomarca da Empresa (BMP ou JPEG, máx. 200x200px)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Selecionar Arquivo
                  </Button>
                  
                  {formData.logomarca && (
                    <div className="flex items-center gap-2">
                      <img 
                        src={formData.logomarca.url} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{formData.logomarca.filename}</p>
                        <p className="text-muted-foreground">Logo carregada</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bmp,.jpeg,.jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Configuração NF */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Configuração de Notas Fiscais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ambiente">Ambiente *</Label>
                  <Select
                    value={formData.configuracaoNF.ambiente}
                    onValueChange={(value: any) => handleInputChange('configuracaoNF', value, 'ambiente')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      <SelectItem value="HOMOLOGACAO">Homologação</SelectItem>
                      <SelectItem value="PRODUCAO">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeracaoNFe">Próximo Número NFe</Label>
                  <Input
                    id="numeracaoNFe"
                    type="number"
                    min="1"
                    value={formData.configuracaoNF.numeracaoNFe}
                    onChange={(e) => handleInputChange('configuracaoNF', parseInt(e.target.value) || 1, 'numeracaoNFe')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeracaoNFCe">Próximo Número NFCe</Label>
                  <Input
                    id="numeracaoNFCe"
                    type="number"
                    min="1"
                    value={formData.configuracaoNF.numeracaoNFCe}
                    onChange={(e) => handleInputChange('configuracaoNF', parseInt(e.target.value) || 1, 'numeracaoNFCe')}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Status</h3>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativa"
                  checked={formData.ativa}
                  onChange={(e) => handleInputChange('ativa', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="ativa">Empresa Ativa</Label>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="min-w-32">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Building className="w-4 h-4 mr-2" />
                    {editingEmpresa ? 'Atualizar' : 'Cadastrar'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmpresasRepresentadasList;
