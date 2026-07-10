import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmpresaRepresentada } from '@/hooks/useEmpresasRepresentadas';
import { toast } from 'sonner';

interface Props {
  empresas: EmpresaRepresentada[];
  onSave: (e: EmpresaRepresentada) => Promise<any> | any;
  onDelete: (id: string) => Promise<any> | any;
}

interface FormState {
  id?: string;
  // colunas reais
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  ativo: boolean;
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
  observacoes: string;
}

const empty = (): FormState => ({
  nome: '', cnpj: '', email: '', telefone: '', endereco: '',
  cidade: '', estado: '', cep: '', ativo: true,
  razao_social: '', nome_fantasia: '', inscricao_estadual: '', inscricao_municipal: '',
  tipo_empresa: '', regime_tributario: '', perfil_tributario: '',
  cnae_principal: '', natureza_juridica: '', data_abertura: '',
  contador_nome: '', contador_crc: '', contador_email: '', observacoes: '',
});

const fromEmpresa = (e?: EmpresaRepresentada | null): FormState => {
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
    cidade: e.cidade || '',
    estado: e.estado || '',
    cep: e.cep || '',
    ativo: e.ativo ?? true,
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
    observacoes: c.observacoes || '',
  };
};

const EmpresasRepresentadasList: React.FC<Props> = ({ empresas, onSave, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmpresaRepresentada | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [toDelete, setToDelete] = useState<EmpresaRepresentada | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const lastCnpjRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    setForm(fromEmpresa(editing));
    lastCnpjRef.current = '';
  }, [open, editing]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
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
  }, [form.cnpj, open]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (e: EmpresaRepresentada) => { setEditing(e); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: EmpresaRepresentada = {
      id: form.id,
      nome: form.nome,
      cnpj: form.cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep || null,
      ativo: form.ativo,
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
        observacoes: form.observacoes,
      },
    };
    await onSave(payload);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Empresas Representadas</h2>
          <p className="text-muted-foreground">Gerencie as empresas cadastradas</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Empresa</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{e.nome}</div>
                  {e.cnpj && <div className="text-xs text-muted-foreground">{e.cnpj}</div>}
                </div>
                <Badge variant={e.ativo ? 'default' : 'secondary'}>{e.ativo ? 'Ativa' : 'Inativa'}</Badge>
              </div>
              {(e.cidade || e.estado) && (
                <div className="text-sm text-muted-foreground">{[e.cidade, e.estado].filter(Boolean).join('/')}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                  <Edit className="w-3 h-3 mr-1" />Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setToDelete(e)}>
                  <Trash2 className="w-3 h-3 mr-1" />Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {empresas.length === 0 && (
          <Card className="col-span-full p-8 text-center">
            <Building className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Tabs defaultValue="dados" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal / Tributário</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nome *</Label>
                    <Input value={form.nome} onChange={(ev) => setField('nome', ev.target.value)} required />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <div className="relative">
                      <Input value={form.cnpj} onChange={(ev) => setField('cnpj', ev.target.value)} />
                      {loadingCnpj && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Razão Social</Label>
                    <Input value={form.razao_social} onChange={(ev) => setField('razao_social', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Nome Fantasia</Label>
                    <Input value={form.nome_fantasia} onChange={(ev) => setField('nome_fantasia', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(ev) => setField('email', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(ev) => setField('telefone', ev.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Switch checked={!!form.ativo} onCheckedChange={(v) => setField('ativo', v)} id="ativa" />
                    <Label htmlFor="ativa">Empresa ativa</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>CEP</Label>
                    <Input value={form.cep} onChange={(ev) => setField('cep', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.cidade} onChange={(ev) => setField('cidade', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={form.estado} onChange={(ev) => setField('estado', ev.target.value)} maxLength={2} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Endereço completo</Label>
                    <Textarea value={form.endereco} onChange={(ev) => setField('endereco', ev.target.value)} />
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
                    <Input value={form.inscricao_estadual} onChange={(ev) => setField('inscricao_estadual', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Inscrição Municipal</Label>
                    <Input value={form.inscricao_municipal} onChange={(ev) => setField('inscricao_municipal', ev.target.value)} />
                  </div>
                  <div>
                    <Label>CNAE Principal</Label>
                    <Input value={form.cnae_principal} onChange={(ev) => setField('cnae_principal', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Natureza Jurídica</Label>
                    <Input value={form.natureza_juridica} onChange={(ev) => setField('natureza_juridica', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Data de Abertura</Label>
                    <Input type="date" value={form.data_abertura} onChange={(ev) => setField('data_abertura', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Contador - Nome</Label>
                    <Input value={form.contador_nome} onChange={(ev) => setField('contador_nome', ev.target.value)} />
                  </div>
                  <div>
                    <Label>Contador - CRC</Label>
                    <Input value={form.contador_crc} onChange={(ev) => setField('contador_crc', ev.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Contador - Email</Label>
                    <Input type="email" value={form.contador_email} onChange={(ev) => setField('contador_email', ev.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea value={form.observacoes} onChange={(ev) => setField('observacoes', ev.target.value)} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir empresa?"
        description={`A empresa "${toDelete?.nome || ''}" será removida.`}
        onConfirm={async () => { if (toDelete?.id) await onDelete(toDelete.id); setToDelete(null); }}
      />
    </div>
  );
};

export default EmpresasRepresentadasList;
