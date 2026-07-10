
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Upload, Users, Building2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Cliente } from '@/types/cliente';
import { consultarCEP, formatarCPF, formatarCNPJ, formatarCEP, validarCPF } from '@/services/cnpjApi';
import { useCnpjLookupImperative } from '@/hooks/useCnpjLookup';
import { toast } from 'sonner';
import { TelefoneManager } from '@/components/modules/TelefoneManager';
import { EmailManager } from '@/components/modules/clientes/EmailManager';
import { ContatoEmpresaManager } from '@/components/modules/clientes/ContatoEmpresaManager';
import { CNAEAutocomplete } from '@/components/modules/clientes/CNAEAutocomplete';
import { MultiSelectComunicacao } from '@/components/modules/clientes/MultiSelectComunicacao';
import { DocumentUpload } from '@/components/modules/DocumentUpload';
import { estadosCivis } from '@/data/estadosCivis';
import { niveisEscolaridade } from '@/data/niveisEscolaridade';
import { formasAtuacao } from '@/data/formasAtuacao';
import { useSetores } from '@/hooks/useSetores';

interface FormClienteProps {
  cliente?: Cliente;
  onSave: (cliente: Cliente) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

export const FormCliente: React.FC<FormClienteProps> = ({
  cliente,
  onSave,
  onCancel,
  loading = false
}) => {
  const { setores } = useSetores();
  const [formData, setFormData] = useState<Cliente>({
    nome: '',
    apelido: '',
    emails: [''],
    telefones: [''],
    cpfCnpj: '',
    tipo: 'F',
    rg: '',
    dataNascimento: '',
    endereco: {
      pais: 'Brasil'
    },
    qualificacaoFiscal: {},
    dadosPessoais: {
      estadoCivil: '',
      profissao: '',
      escolaridade: '',
      meiosComunicacaoPreferenciais: []
    },
    dadosEmpresa: {
      nomeFantasia: '',
      cnae: '',
      site: '',
      formaAtuacao: '',
      dataFundacao: '',
      atividadePrincipal: '',
      contatoEmpresa: {
        nomeCompleto: '',
        departamento: '',
        cargo: ''
      }
    },
    contatos: [],
    documentos: [],
    ativo: true
  });

  const [loadingApi, setLoadingApi] = useState(false);
  const [date, setDate] = useState<Date>();
  const [dataFundacao, setDataFundacao] = useState<Date>();

  useEffect(() => {
    console.log('[FormCliente] Inicializando formulário com cliente:', cliente);
    if (cliente) {
      setFormData({
        ...cliente,
        emails: cliente.emails || [''],
        telefones: cliente.telefones || [''],
        dadosPessoais: cliente.dadosPessoais || {
          estadoCivil: '',
          profissao: '',
          escolaridade: '',
          meiosComunicacaoPreferenciais: []
        },
        dadosEmpresa: cliente.dadosEmpresa || {
          nomeFantasia: '',
          cnae: '',
          site: '',
          formaAtuacao: '',
          dataFundacao: '',
          atividadePrincipal: '',
          contatoEmpresa: {
            nomeCompleto: '',
            departamento: '',
            cargo: ''
          }
        },
        contatos: cliente.contatos || [],
        documentos: cliente.documentos || []
      });
      
      if (cliente.dataNascimento) {
        setDate(new Date(cliente.dataNascimento));
      }
      if (cliente.dadosEmpresa?.dataFundacao) {
        setDataFundacao(new Date(cliente.dadosEmpresa.dataFundacao));
      }
    }
  }, [cliente]);

  const handleCpfCnpjChange = async (value: string) => {
    console.log('[FormCliente] Alterando CPF/CNPJ para:', value);
    const cleanValue = value.replace(/\D/g, '');
    
    if (formData.tipo === 'F') {
      setFormData(prev => ({ ...prev, cpfCnpj: formatarCPF(cleanValue) }));
    } else if (formData.tipo === 'J') {
      setFormData(prev => ({ ...prev, cpfCnpj: formatarCNPJ(cleanValue) }));
      
      if (cleanValue.length === 14) {
        setLoadingApi(true);
        console.log('[FormCliente] Consultando CNPJ:', cleanValue);
        try {
          const cnpjData = await consultarCNPJ(cleanValue);
          if (cnpjData) {
            console.log('[FormCliente] Dados do CNPJ recebidos:', cnpjData);
            setFormData(prev => ({
              ...prev,
              nome: cnpjData.nome,
              dadosEmpresa: {
                ...prev.dadosEmpresa!,
                nomeFantasia: cnpjData.fantasia || '',
                atividadePrincipal: ''
              },
              endereco: {
                ...prev.endereco,
                cep: formatarCEP(cnpjData.cep || ''),
                logradouro: cnpjData.logradouro || '',
                numero: cnpjData.numero || '',
                complemento: cnpjData.complemento || '',
                bairro: cnpjData.bairro || '',
                cidade: cnpjData.municipio || '',
                uf: cnpjData.uf || '',
                pais: 'Brasil'
              },
              qualificacaoFiscal: {
                ...prev.qualificacaoFiscal,
                porte: cnpjData.porte || ''
              }
            }));
          }
        } catch (error) {
          console.error('[FormCliente] Erro ao consultar CNPJ:', error);
        } finally {
          setLoadingApi(false);
        }
      }
    }
  };

  const handleCepChange = async (value: string) => {
    console.log('[FormCliente] Alterando CEP para:', value);
    const cleanValue = value.replace(/\D/g, '');
    const formattedCep = formatarCEP(cleanValue);
    
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, cep: formattedCep }
    }));

    if (cleanValue.length === 8) {
      setLoadingApi(true);
      console.log('[FormCliente] Consultando CEP:', cleanValue);
      try {
        const cepData = await consultarCEP(cleanValue);
        if (cepData) {
          console.log('[FormCliente] Dados do CEP recebidos:', cepData);
          setFormData(prev => ({
            ...prev,
            endereco: {
              ...prev.endereco,
              logradouro: cepData.logradouro || '',
              bairro: cepData.bairro || '',
              cidade: cepData.localidade || '',
              uf: cepData.uf || ''
            }
          }));
        }
      } catch (error) {
        console.error('[FormCliente] Erro ao consultar CEP:', error);
      } finally {
        setLoadingApi(false);
      }
    }
  };

  const handleTipoChange = (tipo: 'F' | 'J') => {
    console.log('[FormCliente] Alterando tipo para:', tipo);
    setFormData(prev => ({ ...prev, tipo }));
    // Limpar campos específicos do tipo anterior
    if (tipo === 'F') {
      setFormData(prev => ({
        ...prev,
        dadosEmpresa: {
          nomeFantasia: '',
          cnae: '',
          site: '',
          formaAtuacao: '',
          dataFundacao: '',
          atividadePrincipal: '',
          contatoEmpresa: {
            nomeCompleto: '',
            departamento: '',
            cargo: ''
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dadosPessoais: {
          estadoCivil: '',
          profissao: '',
          escolaridade: '',
          meiosComunicacaoPreferenciais: []
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[FormCliente] Enviando formulário com dados:', formData);
    
    const clienteData = {
      ...formData,
      dataNascimento: date ? format(date, 'yyyy-MM-dd') : '',
      dadosEmpresa: formData.tipo === 'J' ? {
        ...formData.dadosEmpresa,
        dataFundacao: dataFundacao ? format(dataFundacao, 'yyyy-MM-dd') : ''
      } : undefined
    };

    const success = await onSave(clienteData);
    if (success) {
      console.log('[FormCliente] Cliente salvo com sucesso');
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seletor de Tipo - Destaque no topo */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Tipo de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={formData.tipo === 'F' ? 'default' : 'outline'}
              onClick={() => handleTipoChange('F')}
              className="flex-1 h-12 transition-all duration-200"
            >
              <Users className="mr-2 h-4 w-4" />
              Pessoa Física
            </Button>
            <Button
              type="button"
              variant={formData.tipo === 'J' ? 'default' : 'outline'}
              onClick={() => handleTipoChange('J')}
              className="flex-1 h-12 transition-all duration-200"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Pessoa Jurídica
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção Identificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Básicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">{formData.tipo === 'F' ? 'CPF' : 'CNPJ'}</Label>
              <div className="relative">
                <Input
                  id="cpf_cnpj"
                  value={formData.cpfCnpj || ''}
                  onChange={(e) => handleCpfCnpjChange(e.target.value)}
                  onBlur={() => {
                    if (formData.tipo !== 'F') return;
                    const clean = (formData.cpfCnpj || '').replace(/\D/g, '');
                    if (clean && !validarCPF(clean)) toast.error('CPF inválido — verifique os dígitos');
                  }}
                  placeholder={formData.tipo === 'F' ? '000.000.000-00' : '00.000.000/0000-00'}
                />
                {loadingApi && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome {formData.tipo === 'J' ? '/ Razão Social' : 'Completo'} *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apelido">{formData.tipo === 'F' ? 'Apelido' : 'Nome Fantasia'}</Label>
              <Input
                id="apelido"
                value={formData.apelido || ''}
                onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
              />
            </div>
          </div>

          {formData.tipo === 'F' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg || ''}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            )}

            {/* Campos específicos para PF */}
            {formData.tipo === 'F' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Select
                      value={formData.dadosPessoais?.estadoCivil || ''}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        dadosPessoais: { ...formData.dadosPessoais!, estadoCivil: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar estado civil" />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosCivis.map(estado => (
                          <SelectItem key={estado.value} value={estado.value}>
                            {estado.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profissao">Profissão</Label>
                    <Input
                      id="profissao"
                      value={formData.dadosPessoais?.profissao || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        dadosPessoais: { ...formData.dadosPessoais!, profissao: e.target.value }
                      })}
                      placeholder="Informe a profissão"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="escolaridade">Nível de Escolaridade</Label>
                    <Select
                      value={formData.dadosPessoais?.escolaridade || ''}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        dadosPessoais: { ...formData.dadosPessoais!, escolaridade: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar escolaridade" />
                      </SelectTrigger>
                      <SelectContent>
                        {niveisEscolaridade.map(nivel => (
                          <SelectItem key={nivel.value} value={nivel.value}>
                            {nivel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <MultiSelectComunicacao
                      value={formData.dadosPessoais?.meiosComunicacaoPreferenciais || []}
                      onChange={(value) => setFormData({
                        ...formData,
                        dadosPessoais: { ...formData.dadosPessoais!, meiosComunicacaoPreferenciais: value }
                      })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Campos específicos para PJ */}
            {formData.tipo === 'J' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="data_fundacao">Data de Fundação</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataFundacao ? format(dataFundacao, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dataFundacao}
                          onSelect={setDataFundacao}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forma_atuacao">Forma de Atuação</Label>
                    <Select
                      value={formData.dadosEmpresa?.formaAtuacao || ''}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        dadosEmpresa: { ...formData.dadosEmpresa!, formaAtuacao: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar forma de atuação" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasAtuacao.map(forma => (
                          <SelectItem key={forma.value} value={forma.value}>
                            {forma.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <CNAEAutocomplete
                    value={formData.dadosEmpresa?.cnae || ''}
                    onChange={(value) => setFormData({
                      ...formData,
                      dadosEmpresa: { ...formData.dadosEmpresa!, cnae: value }
                    })}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="site">Site da Empresa</Label>
                    <Input
                      id="site"
                      type="url"
                      value={formData.dadosEmpresa?.site || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        dadosEmpresa: { ...formData.dadosEmpresa!, site: e.target.value }
                      })}
                      placeholder="https://www.exemplo.com.br"
                    />
                  </div>
                </div>
              </>
            )}
        </CardContent>
      </Card>

      {/* Seção Contato na Empresa - apenas para PJ */}
      {formData.tipo === 'J' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contato na Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_contato">Nome Completo *</Label>
                <Input
                  id="nome_contato"
                  value={formData.dadosEmpresa?.contatoEmpresa?.nomeCompleto || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    dadosEmpresa: {
                      ...formData.dadosEmpresa!,
                      contatoEmpresa: {
                        ...formData.dadosEmpresa!.contatoEmpresa!,
                        nomeCompleto: e.target.value
                      }
                    }
                  })}
                  placeholder="Nome do contato principal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento</Label>
                <Input
                  id="departamento"
                  value={formData.dadosEmpresa?.contatoEmpresa?.departamento || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    dadosEmpresa: {
                      ...formData.dadosEmpresa!,
                      contatoEmpresa: {
                        ...formData.dadosEmpresa!.contatoEmpresa!,
                        departamento: e.target.value
                      }
                    }
                  })}
                  placeholder="Ex: Compras, Financeiro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.dadosEmpresa?.contatoEmpresa?.cargo || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  dadosEmpresa: {
                    ...formData.dadosEmpresa!,
                    contatoEmpresa: {
                      ...formData.dadosEmpresa!.contatoEmpresa!,
                      cargo: e.target.value
                    }
                  }
                })}
                placeholder="Ex: Gerente, Coordenador"
              />
            </div>
          </CardContent>
        </Card>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={formData.endereco?.pais || 'Brasil'}
                onChange={(e) => setFormData({
                  ...formData,
                  endereco: { ...formData.endereco, pais: e.target.value }
                })}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Seção Contato */}
      {formData.tipo === 'F' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmailManager
                emails={formData.emails || ['']}
                onChange={(emails) => setFormData({ ...formData, emails })}
              />
              
              <TelefoneManager
                telefones={formData.telefones?.map(t => ({ numero: t, tipo: 'celular' })) || [{ numero: '', tipo: 'celular' }]}
                onChange={(telefones) => setFormData({ ...formData, telefones: telefones.map(t => t.numero) })}
              />
            </div>
            
            {/* Setor da Empresa - para integração CRM */}
            <div className="space-y-2">
              <Label htmlFor="setor">Setor da Empresa</Label>
              <Select
                value={formData.setorId || ''}
                onValueChange={(value) => setFormData({ ...formData, setorId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map(setor => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.codigo} - {setor.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gerenciador de Contatos para PJ */}
          <ContatoEmpresaManager
            contatos={formData.contatos || []}
            onChange={(contatos) => setFormData({ ...formData, contatos })}
          />
          
          {/* Setor da Empresa - para integração CRM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="setor">Setor da Empresa</Label>
                <Select
                  value={formData.setorId || ''}
                  onValueChange={(value) => setFormData({ ...formData, setorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map(setor => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.codigo} - {setor.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Seção Fiscal - apenas para PJ */}
      {formData.tipo === 'J' && (
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
                  onChange={(e) => setFormData({
                    ...formData,
                    qualificacaoFiscal: {
                      ...formData.qualificacaoFiscal,
                      inscricaoEstadual: e.target.value
                    }
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                <Input
                  id="inscricao_municipal"
                  value={formData.qualificacaoFiscal?.inscricaoMunicipal || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    qualificacaoFiscal: {
                      ...formData.qualificacaoFiscal,
                      inscricaoMunicipal: e.target.value
                    }
                  })}
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
      )}

      {/* Seção Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Documentos <span className="text-sm font-normal text-muted-foreground">(Opcional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUpload
            label="Documentos"
            value=""
            onChange={(value) => {
              console.log('[FormCliente] Documento enviado:', value);
              if (value) {
                const documento = {
                  id: crypto.randomUUID(),
                  nome: `Documento ${Date.now()}`,
                  tipo: 'application/pdf',
                  url: value
                };
                setFormData(prev => ({
                  ...prev,
                  documentos: [...(prev.documentos || []), documento]
                }));
              }
            }}
            accept="image/*,application/pdf"
            maxSize={5}
          />
          
          {formData.documentos && formData.documentos.length > 0 && (
            <div className="mt-4">
              <Label>Documentos Anexados:</Label>
              <div className="space-y-2 mt-2">
                {formData.documentos.map((doc, index) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{doc.nome}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('[FormCliente] Removendo documento:', doc.nome);
                        setFormData(prev => ({
                          ...prev,
                          documentos: prev.documentos?.filter((_, i) => i !== index) || []
                        }));
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {cliente?.id ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
};
