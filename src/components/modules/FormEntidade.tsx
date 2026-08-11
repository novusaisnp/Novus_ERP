import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, User, Loader2 } from 'lucide-react';
import { CpfInput } from '@/components/shared/CpfInput';
import { CnpjLookupInput } from '@/components/shared/CnpjLookupInput';
import { EnderecoSection, type EnderecoValue } from '@/components/modules/shared/EnderecoSection';
import { cargoService } from '@/services/cargoService';
import { departamentoService } from '@/services/departamentoService';
import { setorService } from '@/services/setorService';
import { PAPEIS_CATALOGO, type Entidade, type PapelCodigo, type TipoPessoaEntidade } from '@/types/entidade';
import { CamposExtrasSection } from '@/components/modules/CamposExtrasSection';
import { camposExtrasPreenchidos } from '@/utils/camposExtrasUtils';
import type { CampoPersonalizado } from '@/types/campoPersonalizado';
import type { Json } from '@/integrations/supabase/types';

interface FormEntidadeProps {
  entidade?: Entidade;
  empresaRepresentadaId: string;
  /** Papéis marcados por padrão num cadastro novo (a tela de origem decide — ex. Clientes.tsx sugere CLIENTE). */
  papeisIniciais?: PapelCodigo[];
  onSave: (entidade: Entidade) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  camposPersonalizados?: CampoPersonalizado[];
}

const EMPTY: Omit<Entidade, 'empresaRepresentadaId'> = {
  tipoPessoa: 'PJ',
  papeis: [],
  nome: '',
  ativo: true,
};

export const FormEntidade: React.FC<FormEntidadeProps> = ({
  entidade,
  empresaRepresentadaId,
  papeisIniciais = [],
  onSave,
  onCancel,
  loading = false,
  camposPersonalizados = [],
}) => {
  const [formData, setFormData] = useState<Entidade>({ ...EMPTY, empresaRepresentadaId, papeis: papeisIniciais });
  const [cepLoading, setCepLoading] = useState(false);
  const [camposExtrasError, setCamposExtrasError] = useState(false);

  const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: cargoService.fetchCargos });
  const { data: departamentos = [] } = useQuery({ queryKey: ['departamentos'], queryFn: departamentoService.fetchDepartamentos });
  const { data: setores = [] } = useQuery({ queryKey: ['setores'], queryFn: setorService.fetchSetores });

  useEffect(() => {
    setCamposExtrasError(false);
    if (entidade) {
      setFormData(entidade);
    } else {
      setFormData({ ...EMPTY, empresaRepresentadaId, papeis: papeisIniciais });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidade, empresaRepresentadaId]);

  const isPJ = formData.tipoPessoa === 'PJ';
  const papeisDisponiveis = PAPEIS_CATALOGO.filter((p) => p.tipoPessoaPermitido === 'AMBOS' || p.tipoPessoaPermitido === formData.tipoPessoa);
  const temColaborador = formData.papeis.includes('COLABORADOR');

  const handleChange = <K extends keyof Entidade>(field: K, value: Entidade[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCampoExtraChange = (chave: string, valor: Json) => {
    setCamposExtrasError(false);
    setFormData((prev) => ({
      ...prev,
      camposExtras: { ...prev.camposExtras, [chave]: valor },
    }));
  };

  const handleTipoPessoaChange = (tipo: TipoPessoaEntidade) => {
    // Papel que não é mais permitido pro novo tipo sai da seleção (ex.: trocar
    // de PF pra PJ com Colaborador marcado — Colaborador só existe em PF).
    const permitido = PAPEIS_CATALOGO.filter((p) => p.tipoPessoaPermitido === 'AMBOS' || p.tipoPessoaPermitido === tipo).map((p) => p.codigo);
    setFormData((prev) => ({
      ...prev,
      tipoPessoa: tipo,
      papeis: prev.papeis.filter((p) => permitido.includes(p)),
    }));
  };

  const togglePapel = (papel: PapelCodigo, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      papeis: checked ? [...prev.papeis, papel] : prev.papeis.filter((p) => p !== papel),
    }));
  };

  const handleDadosColaboradorChange = <K extends keyof NonNullable<Entidade['dadosColaborador']>>(
    field: K,
    value: NonNullable<Entidade['dadosColaborador']>[K],
  ) => {
    setFormData((prev) => ({ ...prev, dadosColaborador: { ...prev.dadosColaborador, [field]: value } }));
  };

  const handleEnderecoField = (field: keyof EnderecoValue, value: string) => {
    setFormData((prev) => ({ ...prev, [field === 'uf' ? 'estado' : field]: value }));
  };

  const handleCepChange = async (value: string) => {
    handleEnderecoField('cep', value);
    const clean = value.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const { consultarCEP } = await import('@/services/cnpjApi');
      const addr = await consultarCEP(clean);
      if (addr) {
        setFormData((prev) => ({
          ...prev,
          logradouro: addr.logradouro || prev.logradouro,
          bairro: addr.bairro || prev.bairro,
          cidade: addr.localidade || prev.cidade,
          estado: addr.uf || prev.estado,
        }));
      }
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.papeis.length === 0) {
      return;
    }
    if (!camposExtrasPreenchidos(camposPersonalizados, formData.camposExtras ?? {})) {
      setCamposExtrasError(true);
      return;
    }
    const ok = await onSave(formData);
    if (ok) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={formData.tipoPessoa} onValueChange={(v) => handleTipoPessoaChange(v as TipoPessoaEntidade)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="PJ" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Pessoa Jurídica
              </TabsTrigger>
              <TabsTrigger value="PF" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Pessoa Física
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {formData.papeis.includes('CLIENTE') && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Qualificação fiscal para NF-e</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Indicador de Inscrição Estadual *</Label>
              <Select value={formData.indicadorIe || ''} onValueChange={(value) => handleChange('indicadorIe', value as Entidade['indicadorIe'])}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Contribuinte de ICMS</SelectItem>
                  <SelectItem value="2">2 — Contribuinte isento</SelectItem>
                  <SelectItem value="9">9 — Não contribuinte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox
                id="consumidorFinal"
                checked={formData.consumidorFinal === true}
                onCheckedChange={(value) => handleChange('consumidorFinal', value === true)}
              />
              <Label htmlFor="consumidorFinal">Consumidor final</Label>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Papéis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {papeisDisponiveis.map((p) => (
              <div key={p.codigo} className="flex items-center space-x-2">
                <Checkbox
                  id={`papel-${p.codigo}`}
                  checked={formData.papeis.includes(p.codigo)}
                  onCheckedChange={(checked) => togglePapel(p.codigo, checked as boolean)}
                />
                <Label htmlFor={`papel-${p.codigo}`}>{p.label}</Label>
              </div>
            ))}
          </div>
          {formData.papeis.length === 0 && (
            <p className="text-sm text-destructive mt-2">Selecione pelo menos um papel.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isPJ ? (
              <>
                <div>
                  <Label htmlFor="razaoSocial">Razão Social *</Label>
                  <Input id="razaoSocial" value={formData.razaoSocial || ''} onChange={(e) => { handleChange('razaoSocial', e.target.value); handleChange('nome', e.target.value); }} required />
                </div>
                <div>
                  <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                  <Input id="nomeFantasia" value={formData.nomeFantasia || ''} onChange={(e) => handleChange('nomeFantasia', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <CnpjLookupInput
                    id="cnpj"
                    value={formData.cnpj || ''}
                    onChange={(v) => handleChange('cnpj', v)}
                    onLookup={(data) => setFormData((prev) => ({
                      ...prev,
                      razaoSocial: data.nome || prev.razaoSocial,
                      nomeFantasia: data.fantasia || prev.nomeFantasia,
                      nome: data.nome || prev.nome,
                      logradouro: data.logradouro || prev.logradouro,
                      numero: data.numero || prev.numero,
                      bairro: data.bairro || prev.bairro,
                      cidade: data.municipio || prev.cidade,
                      estado: data.uf || prev.estado,
                      cep: data.cep || prev.cep,
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                  <Input id="inscricaoEstadual" value={formData.inscricaoEstadual || ''} onChange={(e) => handleChange('inscricaoEstadual', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
                  <Input id="inscricaoMunicipal" value={formData.inscricaoMunicipal || ''} onChange={(e) => handleChange('inscricaoMunicipal', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="dataFundacao">Data de Fundação</Label>
                  <Input id="dataFundacao" type="date" value={formData.dataFundacao || ''} onChange={(e) => handleChange('dataFundacao', e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input id="nome" value={formData.nome} onChange={(e) => handleChange('nome', e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <CpfInput id="cpf" value={formData.cpf || ''} onChange={(v) => handleChange('cpf', v)} required />
                </div>
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input id="rg" value={formData.rg || ''} onChange={(e) => handleChange('rg', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input id="dataNascimento" type="date" value={formData.dataNascimento || ''} onChange={(e) => handleChange('dataNascimento', e.target.value)} />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="apelido">{isPJ ? 'Apelido' : 'Apelido / Como é conhecido'}</Label>
              <Input id="apelido" value={formData.apelido || ''} onChange={(e) => handleChange('apelido', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="emailSecundario">Email Secundário</Label>
              <Input id="emailSecundario" type="email" value={formData.emailSecundario || ''} onChange={(e) => handleChange('emailSecundario', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={formData.telefone || ''} onChange={(e) => handleChange('telefone', e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div>
              <Label htmlFor="celular">Celular / WhatsApp</Label>
              <Input id="celular" value={formData.celular || ''} onChange={(e) => handleChange('celular', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            {isPJ && (
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formData.website || ''} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EnderecoSection
        endereco={{ cep: formData.cep || '', logradouro: formData.logradouro || '', numero: formData.numero || '', complemento: formData.complemento || '', bairro: formData.bairro || '', cidade: formData.cidade || '', uf: formData.estado || '' }}
        onFieldChange={(field, value) => handleEnderecoField(field, value)}
        onCepChange={handleCepChange}
        loadingCep={cepLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Bancários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" value={formData.banco || ''} onChange={(e) => handleChange('banco', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="agencia">Agência</Label>
              <Input id="agencia" value={formData.agencia || ''} onChange={(e) => handleChange('agencia', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="conta">Conta</Label>
              <Input id="conta" value={formData.conta || ''} onChange={(e) => handleChange('conta', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pix">Chave Pix</Label>
              <Input id="pix" value={formData.pix || ''} onChange={(e) => handleChange('pix', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {temColaborador && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados de Colaborador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cargoId">Cargo</Label>
                <Select value={formData.dadosColaborador?.cargoId || ''} onValueChange={(v) => handleDadosColaboradorChange('cargoId', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                  <SelectContent>
                    {cargos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="departamentoId">Departamento</Label>
                <Select value={formData.dadosColaborador?.departamentoId || ''} onValueChange={(v) => handleDadosColaboradorChange('departamentoId', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="setorId">Setor</Label>
                <Select value={formData.dadosColaborador?.setorId || ''} onValueChange={(v) => handleDadosColaboradorChange('setorId', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dataAdmissao">Data de Admissão</Label>
                <Input id="dataAdmissao" type="date" value={formData.dadosColaborador?.dataAdmissao || ''} onChange={(e) => handleDadosColaboradorChange('dataAdmissao', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dataDemissao">Data de Demissão</Label>
                <Input id="dataDemissao" type="date" value={formData.dadosColaborador?.dataDemissao || ''} onChange={(e) => handleDadosColaboradorChange('dataDemissao', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                <Select value={formData.dadosColaborador?.tipoContrato || ''} onValueChange={(v) => handleDadosColaboradorChange('tipoContrato', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFETIVO">Efetivo</SelectItem>
                    <SelectItem value="TEMPORARIO">Temporário</SelectItem>
                    <SelectItem value="EXPERIENCIA">Experiência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="regimeTrabalho">Regime de Trabalho</Label>
                <Select value={formData.dadosColaborador?.regimeTrabalho || ''} onValueChange={(v) => handleDadosColaboradorChange('regimeTrabalho', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                    <SelectItem value="REMOTO">Remoto</SelectItem>
                    <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="salario">Salário Base</Label>
                <CurrencyInput id="salario" value={formData.dadosColaborador?.salario ?? 0} onValueChange={(v) => handleDadosColaboradorChange('salario', v)} placeholder="R$ 0,00" />
              </div>
              <div>
                <Label htmlFor="pis">PIS</Label>
                <Input id="pis" value={formData.dadosColaborador?.pis || ''} onChange={(e) => handleDadosColaboradorChange('pis', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ctps">CTPS</Label>
                <Input id="ctps" value={formData.dadosColaborador?.ctps || ''} onChange={(e) => handleDadosColaboradorChange('ctps', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CamposExtrasSection
        campos={camposPersonalizados}
        valores={formData.camposExtras ?? {}}
        onChange={handleCampoExtraChange}
      />
      {camposExtrasError && (
        <p className="text-sm text-destructive">Preencha todos os campos adicionais obrigatórios.</p>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" value={formData.observacoes || ''} onChange={(e) => handleChange('observacoes', e.target.value)} rows={3} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="ativo" checked={formData.ativo} onCheckedChange={(checked) => handleChange('ativo', checked as boolean)} />
            <Label htmlFor="ativo">Entidade ativa</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || formData.papeis.length === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {entidade?.id ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
};
