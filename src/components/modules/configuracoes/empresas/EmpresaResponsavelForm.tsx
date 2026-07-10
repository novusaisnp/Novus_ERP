import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save, Loader2 } from 'lucide-react';
import { EmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { toast } from 'sonner';

interface Props {
  empresa?: EmpresaResponsavel | null;
  onSave: (empresa: EmpresaResponsavel) => Promise<any> | any;
  saving?: boolean;
}

const empty = (): EmpresaResponsavel => ({
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  endereco: '',
  logo_url: '',
});

const EmpresaResponsavelForm: React.FC<Props> = ({ empresa, onSave, saving }) => {
  const [form, setForm] = useState<EmpresaResponsavel>(empty());
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const lastCnpjRef = useRef<string>('');

  useEffect(() => {
    if (empresa) setForm({ ...empty(), ...empresa });
  }, [empresa]);

  const setField = <K extends keyof EmpresaResponsavel>(k: K, v: EmpresaResponsavel[K]) =>
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
          endereco: endereco || p.endereco || '',
          email: p.email || data.email || '',
          telefone: p.telefone || `${data.ddd_telefone_1 || ''}`.trim(),
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
    await onSave(form);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setField('nome', e.target.value)} required />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.cnpj || ''} onChange={(e) => setField('cnpj', e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone || ''} onChange={(e) => setField('telefone', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Logo URL</Label>
              <Input value={form.logo_url || ''} onChange={(e) => setField('logo_url', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Textarea value={form.endereco || ''} onChange={(e) => setField('endereco', e.target.value)} />
            </div>
          </div>
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
