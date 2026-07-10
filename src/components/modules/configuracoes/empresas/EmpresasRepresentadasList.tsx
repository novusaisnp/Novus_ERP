import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Building, Plus, Edit, Trash2, Loader2, Upload, X, ImageIcon, FileLock2, ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmpresaRepresentada } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { empresasRepresentadasService } from '@/services/empresasRepresentadasService';
import { toast } from 'sonner';


interface Props {
  empresas: EmpresaRepresentada[];
  onSave: (e: EmpresaRepresentada) => Promise<any> | any;
  onDelete: (id: string) => Promise<any> | any;
  saving?: boolean;
}

type TipoVinculo = '' | 'INDEPENDENTE' | 'MESMA_EMPRESA' | 'FILIAL' | 'GRUPO';

const VINCULO_LABEL: Record<Exclude<TipoVinculo, ''>, string> = {
  INDEPENDENTE: 'Independente',
  MESMA_EMPRESA: 'Mesma Empresa',
  FILIAL: 'Filial',
  GRUPO: 'Grupo',
};

const VINCULO_VARIANT: Record<Exclude<TipoVinculo, ''>, 'default' | 'secondary' | 'outline'> = {
  INDEPENDENTE: 'outline',
  MESMA_EMPRESA: 'secondary',
  FILIAL: 'default',
  GRUPO: 'default',
};

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
  tipo_vinculo: TipoVinculo;
  cnpj_matriz: string;
  // logo e certificado (persistidos em configuracoes jsonb)
  logo_path: string;
  cert_path: string;
  cert_filename: string;
  cert_uploaded_at: string;
}


const empty = (): FormState => ({
  nome: '', cnpj: '', email: '', telefone: '', endereco: '',
  cidade: '', estado: '', cep: '', ativo: true,
  razao_social: '', nome_fantasia: '', inscricao_estadual: '', inscricao_municipal: '',
  tipo_empresa: '', regime_tributario: '', perfil_tributario: '',
  cnae_principal: '', natureza_juridica: '', data_abertura: '',
  contador_nome: '', contador_crc: '', contador_email: '', observacoes: '',
  tipo_vinculo: '', cnpj_matriz: '',
  logo_path: '', cert_path: '', cert_filename: '', cert_uploaded_at: '',
});


const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');
const isValidCnpj = (v: string) => onlyDigits(v).length === 14;

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
    tipo_vinculo: (c.tipo_vinculo as TipoVinculo) || '',
    cnpj_matriz: c.cnpj_matriz || '',
    logo_path: c.logo_path || '',
    cert_path: c.cert_path || '',
    cert_filename: c.cert_filename || '',
    cert_uploaded_at: c.cert_uploaded_at || '',
  };
};


const EmpresasRepresentadasList: React.FC<Props> = ({ empresas, onSave, onDelete, saving }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmpresaRepresentada | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [toDelete, setToDelete] = useState<EmpresaRepresentada | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const lastCnpjRef = useRef<string>('');
  const autoVinculoRef = useRef<string>('');
  const folderKeyRef = useRef<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);

  const { empresa: responsavel } = useEmpresaResponsavel();
  const responsavelCnpj = useMemo(() => onlyDigits(responsavel?.cnpj || ''), [responsavel]);

  useEffect(() => {
    if (!open) {
      setLogoPreviewUrl(null);
      return;
    }
    const initial = fromEmpresa(editing);
    setForm(initial);
    lastCnpjRef.current = '';
    autoVinculoRef.current = '';
    folderKeyRef.current = editing?.id || (crypto as any).randomUUID?.() || `${Date.now()}`;
    // carrega preview do logo se existir
    if (initial.logo_path) {
      empresasRepresentadasService.getSignedUrl('empresa-logos', initial.logo_path).then(setLogoPreviewUrl);
    } else {
      setLogoPreviewUrl(null);
    }
  }, [open, editing]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo deve ter no máximo 2 MB'); return; }
    setUploadingLogo(true);
    try {
      // remove logo anterior
      if (form.logo_path) await empresasRepresentadasService.removeLogo(form.logo_path);
      const { path } = await empresasRepresentadasService.uploadLogo(folderKeyRef.current, file);
      setForm((p) => ({ ...p, logo_path: path }));
      const url = await empresasRepresentadasService.getSignedUrl('empresa-logos', path);
      setLogoPreviewUrl(url);
      toast.success('Logo enviada com sucesso');
    } catch (err: any) {
      toast.error(`Falha ao enviar logo: ${err?.message || 'erro'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (form.logo_path) await empresasRepresentadasService.removeLogo(form.logo_path).catch(() => {});
    setForm((p) => ({ ...p, logo_path: '' }));
    setLogoPreviewUrl(null);
  };

  const handleCertUpload = async (file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pfx', 'p12'].includes(ext)) { toast.error('Envie um arquivo .pfx ou .p12'); return; }
    if (file.size > 200 * 1024) { toast.error('Certificado deve ter no máximo 200 KB'); return; }
    setUploadingCert(true);
    try {
      if (form.cert_path) await empresasRepresentadasService.removeCertificado(form.cert_path);
      const { path, filename } = await empresasRepresentadasService.uploadCertificado(folderKeyRef.current, file);
      const now = new Date().toISOString();
      setForm((p) => ({ ...p, cert_path: path, cert_filename: filename, cert_uploaded_at: now }));
      toast.success('Certificado digital enviado com sucesso');
    } catch (err: any) {
      toast.error(`Falha ao enviar certificado: ${err?.message || 'erro'}`);
    } finally {
      setUploadingCert(false);
    }
  };

  const handleRemoveCert = async () => {
    if (form.cert_path) await empresasRepresentadasService.removeCertificado(form.cert_path).catch(() => {});
    setForm((p) => ({ ...p, cert_path: '', cert_filename: '', cert_uploaded_at: '' }));
  };



  // Auto-detecta "Mesma Empresa" quando o CNPJ digitado bate com o da responsável
  useEffect(() => {
    if (!open) return;
    const cnpjLimpo = onlyDigits(form.cnpj);
    if (cnpjLimpo.length !== 14 || !responsavelCnpj) return;
    if (cnpjLimpo === responsavelCnpj && form.tipo_vinculo !== 'MESMA_EMPRESA' && autoVinculoRef.current !== cnpjLimpo) {
      autoVinculoRef.current = cnpjLimpo;
      setForm((p) => ({ ...p, tipo_vinculo: 'MESMA_EMPRESA' }));
      toast.info('CNPJ igual ao da Empresa Responsável — vínculo definido como "Mesma Empresa"');
    }
  }, [form.cnpj, form.tipo_vinculo, open, responsavelCnpj]);

  useEffect(() => {
    if (!open) return;
    const cnpjLimpo = onlyDigits(form.cnpj);
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

    if (form.tipo_vinculo === 'FILIAL' && !isValidCnpj(form.cnpj_matriz)) {
      toast.error('Informe um CNPJ da Matriz válido (14 dígitos)');
      return;
    }

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
        tipo_vinculo: form.tipo_vinculo || null,
        cnpj_matriz: form.tipo_vinculo === 'FILIAL' ? form.cnpj_matriz : null,
        logo_path: form.logo_path || null,
        cert_path: form.cert_path || null,
        cert_filename: form.cert_filename || null,
        cert_uploaded_at: form.cert_uploaded_at || null,
      },

    };
    await onSave(payload);
    setOpen(false);
  };

  const getVinculo = (e: EmpresaRepresentada): Exclude<TipoVinculo, ''> | null => {
    const c: any = e.configuracoes || {};
    const v = (c.tipo_vinculo || '') as TipoVinculo;
    return v ? (v as Exclude<TipoVinculo, ''>) : null;
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
        {empresas.map((e) => {
          const vinculo = getVinculo(e);
          return (
            <Card key={e.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{e.nome}</span>
                      {vinculo && (
                        <Badge variant={VINCULO_VARIANT[vinculo]} className="text-[10px]">
                          {VINCULO_LABEL[vinculo]}
                        </Badge>
                      )}
                    </div>
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
          );
        })}
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

                  <div>
                    <Label>Tipo de Vínculo</Label>
                    <Select
                      value={form.tipo_vinculo || undefined}
                      onValueChange={(v) => setField('tipo_vinculo', v as TipoVinculo)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDEPENDENTE">Empresa Independente</SelectItem>
                        <SelectItem value="MESMA_EMPRESA">Mesma Empresa (CNPJ idêntico à responsável)</SelectItem>
                        <SelectItem value="FILIAL">Filial (vinculada à responsável como matriz)</SelectItem>
                        <SelectItem value="GRUPO">Empresa do Grupo (conglomerado econômico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.tipo_vinculo === 'FILIAL' && (
                    <div>
                      <Label>CNPJ da Matriz *</Label>
                      <Input
                        value={form.cnpj_matriz}
                        onChange={(ev) => setField('cnpj_matriz', ev.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                      {form.cnpj_matriz && !isValidCnpj(form.cnpj_matriz) && (
                        <p className="text-xs text-destructive mt-1">CNPJ inválido (14 dígitos)</p>
                      )}
                    </div>
                  )}

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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
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
