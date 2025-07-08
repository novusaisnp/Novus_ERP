
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building2, Search, Save, Loader2 } from 'lucide-react';
import { EmpresaResponsavel } from '@/types/empresa';
import { consultarCNPJ, consultarCEP, validarCNPJ, formatarCNPJ, formatarCEP } from '@/services/cnpjApi';

interface EmpresaResponsavelFormProps {
  empresa?: EmpresaResponsavel;
  onSave: (empresa: EmpresaResponsavel) => void;
}

const EmpresaResponsavelForm: React.FC<EmpresaResponsavelFormProps> = ({ empresa, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  const [formData, setFormData] = useState<EmpresaResponsavel>({
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
    nomeResponsavel: '',
    contatos: {
      email: '',
      telefone: '',
      celular: ''
    }
  });

  useEffect(() => {
    if (empresa) {
      console.log('[EmpresaResponsavel]', 'Carregando dados da empresa:', empresa);
      setFormData(empresa);
    }
  }, [empresa]);

  const handleInputChange = (field: string, value: string, subField?: string) => {
    console.log('[EmpresaResponsavel]', 'Alterando campo:', field, subField, value);
    
    setFormData(prev => {
      if (subField) {
        return {
          ...prev,
          [field]: {
            ...prev[field as keyof EmpresaResponsavel] as any,
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
    console.log('[EmpresaResponsavel]', 'Buscando dados do CNPJ:', formData.cnpj);

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
      console.error('[EmpresaResponsavel]', 'Erro ao buscar CNPJ:', error);
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
    console.log('[EmpresaResponsavel]', 'Buscando dados do CEP:', formData.endereco.cep);

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
      console.error('[EmpresaResponsavel]', 'Erro ao buscar CEP:', error);
      toast({
        title: "Erro na consulta",
        description: "Erro ao consultar o CEP.",
        variant: "destructive"
      });
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[EmpresaResponsavel]', 'Salvando empresa responsável:', formData);
    
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

    if (!formData.contatos.email || !/\S+@\S+\.\S+/.test(formData.contatos.email)) {
      toast({
        title: "Email Inválido",
        description: "Por favor, digite um email válido.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.nomeResponsavel || formData.nomeResponsavel.trim().length < 3) {
      toast({
        title: "Nome do Responsável Inválido",
        description: "O nome do responsável deve ter pelo menos 3 caracteres.",
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

      onSave(empresaSalvar);
      
      toast({
        title: "Empresa Salva",
        description: "Os dados da empresa responsável foram salvos com sucesso.",
      });
    } catch (error) {
      console.error('[EmpresaResponsavel]', 'Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os dados da empresa.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader className="gradient-primary text-white">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Empresa Responsável
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
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

          {/* Responsável e Contatos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Responsável e Contatos</h3>
            
            <div className="space-y-2">
              <Label htmlFor="nomeResponsavel">Nome do Responsável *</Label>
              <Input
                id="nomeResponsavel"
                value={formData.nomeResponsavel}
                onChange={(e) => handleInputChange('nomeResponsavel', e.target.value)}
                placeholder="Nome Completo do Responsável"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contatos.email}
                  onChange={(e) => handleInputChange('contatos', e.target.value, 'email')}
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formData.contatos.telefone}
                  onChange={(e) => handleInputChange('contatos', e.target.value, 'telefone')}
                  placeholder="(11) 3000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={formData.contatos.celular || ''}
                  onChange={(e) => handleInputChange('contatos', e.target.value, 'celular')}
                  placeholder="(11) 90000-0000"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={loading} className="min-w-32">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmpresaResponsavelForm;
