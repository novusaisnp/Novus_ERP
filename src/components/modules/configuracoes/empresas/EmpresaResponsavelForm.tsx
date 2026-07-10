import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, Loader2 } from 'lucide-react';
import { EmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { toast } from 'sonner';
import { CepInput } from '@/components/shared/CepInput';

interface Props {
  empresa?: EmpresaResponsavel | null;
  onSave: (empresa: EmpresaResponsavel) => Promise<any> | any;
  saving?: boolean;
}

interface FormState {
  // colunas reais
  id?: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  logo_url: string;
  // configuracoes jsonb
  razao_social: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  tipo_empresa: string;
  regime_tributario: string;
  perfil_tributario: string;
  cnae_principal: string;
  natureza_juridica: string;
  data_abertura: string;
  contador_nome: string;
  contador_crc: string;
  contador_email: string;
  cidade: string;
  estado: string;
  cep: string;
}

const empty = (): FormState => ({
  nome: '', cnpj: '', email: '', telefone: '', endereco: '', logo_url: '',
  razao_social: '', nome_fantasia: '', inscricao_estadual: '', inscricao_municipal: '',
  tipo_empresa: '', regime_tributario: '', perfil_tributario: '',
  cnae_principal: '', natureza_juridica: '', data_abertura: '',
  contador_nome: '', contador_crc: '', contador_email: '',
  cidade: '', estado: '', cep: '',
});

const fromEmpresa = (e?: EmpresaResponsavel | null): FormState => {
  if (!e) return empty();
  const c: any = e.configuracoes || {};
  return {
    ...empty(),
    id: e.id,
    nome: e.nome || '',
    cnpj: e.cnpj || '',
    email: e.email || '',
    telefone: e.telefone || '',
    endereco: e.endereco || '',
    logo_url: e.logo_url || '',
    razao_social: c.razao_social || '',
    nome_fantasia: c.nome_fantasia || '',
    inscricao_estadual: c.inscricao_estadual || '',
    inscricao_municipal: c.inscricao_municipal || '',
    tipo_empresa: c.tipo_empresa || '',
    regime_tributario: c.regime_tributario || '',
    perfil_tributario: c.perfil_tributario || '',
    cnae_principal: c.cnae_principal || '',
    natureza_juridica: c.natureza_juridica || '',
    data_abertura: c.data_abertura || '',
    contador_nome: c.contador_nome || '',
    contador_crc: c.contador_crc || '',
    contador_email: c.contador_email || '',
    cidade: c.cidade || '',
    estado: c.estado || '',
    cep: c.cep || '',
  };
};

const EmpresaResponsavelForm: React.FC<Props> = ({ empresa, onSave, saving }) => {
  const [form, setForm] = useState<FormState>(empty());
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const lastCnpjRef = useRef<string>('');

  useEffect(() => { setForm(fromEmpresa(empresa)); }, [empresa]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const cnpjLimpo = (form.cnpj || '').replace(/\D/g, '');
    if (cnpjLimpo.length !== 14 || cnpjLimpo === lastCnpjRef.current) return;
    const handler = setTimeout(async () => {
      lastCnpjRef.current = cnpjLimpo;
      setLoadingCnpj(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
        if (!res.ok) throw new Error('CNPJ não encontrado');
        const data = await res.json();
        const endereco = [data.logradouro, data.numero, data.bairro].filter(Boolean).join(', ');
        setForm((p) => ({
          ...p,
          nome: p.nome || data.razao_social || '',
          razao_social: p.razao_social || data.razao_social || '',
          nome_fantasia: p.nome_fantasia || data.nome_fantasia || '',
          endereco: endereco || p.endereco || '',
          cidade: p.cidade || data.municipio || '',
          estado: p.estado || data.uf || '',
          cep: p.cep || data.cep || '',
          email: p.email || data.email || '',
          telefone: p.telefone || `${data.ddd_telefone_1 || ''}`.trim(),
          cnae_principal: p.cnae_principal || (data.cnae_fiscal ? String(data.cnae_fiscal) : ''),
          natureza_juridica: p.natureza_juridica || data.natureza_juridica || '',
          data_abertura: p.data_abertura || data.data_inicio_atividade || '',
        }));
        toast.success('Dados do CNPJ preenchidos');
      } catch {
        toast.warning('Não foi possível consultar o CNPJ');
      } finally {
        setLoadingCnpj(false);
      }
    }, 600);
    return () => clearTimeout(handler);
  }, [form.cnpj]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EmpresaResponsavel = {
      id: form.id,
      nome: form.nome,
      cnpj: form.cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      logo_url: form.logo_url || null,
      configuracoes: {
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia,
        inscricao_estadual: form.inscricao_estadual,
        inscricao_municipal: form.inscricao_municipal,
        tipo_empresa: form.tipo_empresa,
        regime_tributario: form.regime_tributario,
        perfil_tributario: form.perfil_tributario,
        cnae_principal: form.cnae_principal,
        natureza_juridica: form.natureza_juridica,
        data_abertura: form.data_abertura,
        contador_nome: form.contador_nome,
        contador_crc: form.contador_crc,
        contador_email: form.contador_email,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
      },
    };
    await onSave(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Empresa Responsável
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal / Tributário</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome / Razão Social *</Label>
                  <Input value={form.nome} onChange={(e) => setField('nome', e.target.value)} required />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <div className="relative">
                    <Input value={form.cnpj} onChange={(e) => setField('cnpj', e.target.value)} />
                    {loadingCnpj && (
                      <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div>
                  <Label>Razão Social (oficial)</Label>
                  <Input value={form.razao_social} onChange={(e) => setField('razao_social', e.target.value)} />
                </div>
                <div>
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nome_fantasia} onChange={(e) => setField('nome_fantasia', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setField('telefone', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Logo URL</Label>
                  <Input value={form.logo_url} onChange={(e) => setField('logo_url', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>CEP</Label>
                  <CepInput
                    value={form.cep}
                    onChange={(v) => setField('cep', v)}
                    onAddressFound={(addr) => {
                      setForm((p) => ({
                        ...p,
                        cep: addr.cep || p.cep,
                        cidade: addr.localidade || p.cidade,
                        estado: addr.uf || p.estado,
                        endereco: p.endereco || [addr.logradouro, addr.bairro].filter(Boolean).join(', '),
                      }));
                    }}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => setField('cidade', e.target.value)} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input value={form.estado} onChange={(e) => setField('estado', e.target.value)} maxLength={2} />
                </div>
                <div className="md:col-span-3">
                  <Label>Endereço completo</Label>
                  <Textarea value={form.endereco} onChange={(e) => setField('endereco', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Empresa</Label>
                  <Select value={form.tipo_empresa || undefined} onValueChange={(v) => setField('tipo_empresa', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MATRIZ">Matriz</SelectItem>
                      <SelectItem value="FILIAL">Filial</SelectItem>
                      <SelectItem value="LTDA">LTDA</SelectItem>
                      <SelectItem value="SA">S/A</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="EIRELI">EIRELI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Regime Tributário</Label>
                  <Select value={form.regime_tributario || undefined} onValueChange={(v) => setField('regime_tributario', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                      <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                      <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Perfil Tributário</Label>
                  <Select value={form.perfil_tributario || undefined} onValueChange={(v) => setField('perfil_tributario', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Perfil A</SelectItem>
                      <SelectItem value="B">Perfil B</SelectItem>
                      <SelectItem value="C">Perfil C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Inscrição Estadual</Label>
                  <Input value={form.inscricao_estadual} onChange={(e) => setField('inscricao_estadual', e.target.value)} />
                </div>
                <div>
                  <Label>Inscrição Municipal</Label>
                  <Input value={form.inscricao_municipal} onChange={(e) => setField('inscricao_municipal', e.target.value)} />
                </div>
                <div>
                  <Label>CNAE Principal</Label>
                  <Input value={form.cnae_principal} onChange={(e) => setField('cnae_principal', e.target.value)} />
                </div>
                <div>
                  <Label>Natureza Jurídica</Label>
                  <Input value={form.natureza_juridica} onChange={(e) => setField('natureza_juridica', e.target.value)} />
                </div>
                <div>
                  <Label>Data de Abertura</Label>
                  <Input type="date" value={form.data_abertura} onChange={(e) => setField('data_abertura', e.target.value)} />
                </div>
                <div>
                  <Label>Contador - Nome</Label>
                  <Input value={form.contador_nome} onChange={(e) => setField('contador_nome', e.target.value)} />
                </div>
                <div>
                  <Label>Contador - CRC</Label>
                  <Input value={form.contador_crc} onChange={(e) => setField('contador_crc', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Contador - Email</Label>
                  <Input type="email" value={form.contador_email} onChange={(e) => setField('contador_email', e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmpresaResponsavelForm;
