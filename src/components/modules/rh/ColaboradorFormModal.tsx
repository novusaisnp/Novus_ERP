
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useColaboradores } from '@/hooks/useColaboradores';
import { cargoService } from '@/services/cargoService';
import { departamentoService } from '@/services/departamentoService';
import { setorService } from '@/services/setorService';
import { Colaborador } from '@/types/rh';
import { toast } from '@/hooks/use-toast';
import { CepInput } from '@/components/shared/CepInput';
import { CpfInput } from '@/components/shared/CpfInput';

interface ColaboradorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador?: Colaborador | null;
}

export const ColaboradorFormModal: React.FC<ColaboradorFormModalProps> = ({
  open,
  onOpenChange,
  colaborador
}) => {
  const { saveColaborador, loading } = useColaboradores();
  const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: cargoService.fetchCargos });
  const { data: departamentos = [] } = useQuery({ queryKey: ['departamentos'], queryFn: departamentoService.fetchDepartamentos });
  const { data: setores = [] } = useQuery({ queryKey: ['setores'], queryFn: setorService.fetchSetores });
  const [formData, setFormData] = useState<Partial<Colaborador>>({
    nomeCompleto: '',
    dataNascimento: new Date(),
    cpf: '',
    rg: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: ''
    },
    telefone: '',
    emailPessoal: '',
    emailCorporativo: '',
    regimeContratacao: 'CLT',
    dataAdmissao: new Date(),
    situacao: true,
    empresaRepresentadaId: '',
    compliance: {
      aceiteLgpd: false,
      consentimentoDados: false
    }
  });

  // Resetar form quando modal abre/fecha ou colaborador muda
  useEffect(() => {
    if (open) {
      if (colaborador) {
        // Modo edição - popular com dados do colaborador
        setFormData({
          ...colaborador,
          dataNascimento: colaborador.dataNascimento,
          dataAdmissao: colaborador.dataAdmissao,
          dataDemissao: colaborador.dataDemissao || undefined
        });
      } else {
        // Modo criação - limpar form
        setFormData({
          nomeCompleto: '',
          dataNascimento: new Date(),
          cpf: '',
          rg: '',
          endereco: {
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            uf: ''
          },
          telefone: '',
          emailPessoal: '',
          emailCorporativo: '',
          regimeContratacao: 'CLT',
          dataAdmissao: new Date(),
          situacao: true,
          empresaRepresentadaId: '',
          compliance: {
            aceiteLgpd: false,
            consentimentoDados: false
          }
        });
      }
    }
  }, [open, colaborador]);

  const handleInputChange = (field: keyof Colaborador, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEnderecoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        [field]: value
      }
    }));
  };

  const handleComplianceChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      compliance: {
        ...prev.compliance,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeCompleto || !formData.cpf || !formData.regimeContratacao) {
      toast({
        title: "Erro de Validação",
        description: "Nome completo, CPF e regime de contratação são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const colaboradorToSave: Colaborador = {
        ...formData,
        id: colaborador?.id,
        nomeCompleto: formData.nomeCompleto!,
        dataNascimento: formData.dataNascimento!,
        cpf: formData.cpf!,
        regimeContratacao: formData.regimeContratacao!,
        dataAdmissao: formData.dataAdmissao!,
        situacao: formData.situacao!,
        empresaRepresentadaId: formData.empresaRepresentadaId!,
        compliance: formData.compliance!
      };

      const success = await saveColaborador(colaboradorToSave);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('[ColaboradorFormModal] Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao salvar o colaborador.",
        variant: "destructive",
      });
    }
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (field: keyof Colaborador, value: string) => {
    if (value) {
      handleInputChange(field, new Date(value + 'T00:00:00'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {colaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basicos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basicos">Dados Básicos</TabsTrigger>
              <TabsTrigger value="contato">Contato</TabsTrigger>
              <TabsTrigger value="profissional">Profissional</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="basicos" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                  <Input
                    id="nomeCompleto"
                    value={formData.nomeCompleto || ''}
                    onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={formatDateForInput(formData.dataNascimento)}
                    onChange={(e) => handleDateChange('dataNascimento', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <CpfInput
                    id="cpf"
                    value={formData.cpf || ''}
                    onChange={(v) => handleInputChange('cpf', v)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg || ''}
                    onChange={(e) => handleInputChange('rg', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contato" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone || ''}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="emailPessoal">Email Pessoal</Label>
                  <Input
                    id="emailPessoal"
                    type="email"
                    value={formData.emailPessoal || ''}
                    onChange={(e) => handleInputChange('emailPessoal', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emailCorporativo">Email Corporativo</Label>
                  <Input
                    id="emailCorporativo"
                    type="email"
                    value={formData.emailCorporativo || ''}
                    onChange={(e) => handleInputChange('emailCorporativo', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Endereço</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <CepInput
                      id="cep"
                      value={formData.endereco?.cep || ''}
                      onChange={(v) => handleEnderecoChange('cep', v)}
                      onAddressFound={(addr) => {
                        setFormData((prev) => ({
                          ...prev,
                          endereco: {
                            ...prev.endereco,
                            cep: addr.cep || prev.endereco?.cep || '',
                            logradouro: addr.logradouro || '',
                            bairro: addr.bairro || '',
                            cidade: addr.localidade || '',
                            uf: addr.uf || '',
                            numero: prev.endereco?.numero || '',
                            complemento: prev.endereco?.complemento || '',
                          },
                        }));
                        setTimeout(() => document.getElementById('numero')?.focus(), 50);
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={formData.endereco?.logradouro || ''}
                      onChange={(e) => handleEnderecoChange('logradouro', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.endereco?.numero || ''}
                      onChange={(e) => handleEnderecoChange('numero', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.endereco?.complemento || ''}
                      onChange={(e) => handleEnderecoChange('complemento', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.endereco?.bairro || ''}
                      onChange={(e) => handleEnderecoChange('bairro', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.endereco?.cidade || ''}
                      onChange={(e) => handleEnderecoChange('cidade', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={formData.endereco?.uf || ''}
                      onChange={(e) => handleEnderecoChange('uf', e.target.value)}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profissional" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="regimeContratacao">Regime de Contratação *</Label>
                  <Select
                    value={formData.regimeContratacao}
                    onValueChange={(value) => handleInputChange('regimeContratacao', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="ESTAGIO">Estágio</SelectItem>
                      <SelectItem value="TERCEIRIZADO">Terceirizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dataAdmissao">Data de Admissão *</Label>
                  <Input
                    id="dataAdmissao"
                    type="date"
                    value={formatDateForInput(formData.dataAdmissao)}
                    onChange={(e) => handleDateChange('dataAdmissao', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="salarioBase">Salário Base</Label>
                  <CurrencyInput
                    id="salarioBase"
                    value={formData.salarioBase ?? 0}
                    onValueChange={(v) => handleInputChange('salarioBase', v)}
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="cargoId">Cargo</Label>
                  <Select
                    value={formData.cargoId || ''}
                    onValueChange={(value) => handleInputChange('cargoId', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                    <SelectContent>
                      {cargos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="departamentoId">Departamento</Label>
                  <Select
                    value={formData.departamentoId || ''}
                    onValueChange={(value) => handleInputChange('departamentoId', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                    <SelectContent>
                      {departamentos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="setorId">Setor</Label>
                  <Select
                    value={formData.setorId || ''}
                    onValueChange={(value) => handleInputChange('setorId', value)}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                    <SelectContent>
                      {setores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="situacao"
                    checked={formData.situacao}
                    onCheckedChange={(checked) => handleInputChange('situacao', checked)}
                  />
                  <Label htmlFor="situacao">Colaborador Ativo</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aceiteLgpd"
                    checked={formData.compliance?.aceiteLgpd || false}
                    onCheckedChange={(checked) => handleComplianceChange('aceiteLgpd', checked as boolean)}
                  />
                  <Label htmlFor="aceiteLgpd">Aceite LGPD</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="consentimentoDados"
                    checked={formData.compliance?.consentimentoDados || false}
                    onCheckedChange={(checked) => handleComplianceChange('consentimentoDados', checked as boolean)}
                  />
                  <Label htmlFor="consentimentoDados">Consentimento para uso de dados</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (colaborador ? 'Atualizar' : 'Cadastrar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
