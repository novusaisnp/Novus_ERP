import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import type {
  ContaReceber,
  ContaReceberInput,
  ContaReceberStatus,
} from '@/types/contasReceber';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ContaReceberInput, id?: string) => Promise<void> | void;
  editing?: ContaReceber | null;
  saving?: boolean;
}

interface FormState {
  empresa_representada_id: string;
  cliente_id: string;
  descricao: string;
  numero_documento: string;
  valor_original: string;
  data_emissao: string;
  data_vencimento: string;
  status: ContaReceberStatus;
  observacoes: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);

const empty = (): FormState => ({
  empresa_representada_id: '',
  cliente_id: '',
  descricao: '',
  numero_documento: '',
  valor_original: '',
  data_emissao: hoje(),
  data_vencimento: hoje(),
  status: 'PENDENTE',
  observacoes: '',
});

const fromConta = (c: ContaReceber): FormState => ({
  empresa_representada_id: c.empresa_representada_id || '',
  cliente_id: c.cliente_id || '',
  descricao: c.descricao || '',
  numero_documento: c.numero_documento || '',
  valor_original: String(c.valor_original ?? ''),
  data_emissao: c.data_emissao || hoje(),
  data_vencimento: c.data_vencimento || hoje(),
  status: c.status || 'PENDENTE',
  observacoes: c.observacoes || '',
});

export function ContaReceberFormModal({
  isOpen,
  onClose,
  onSubmit,
  editing,
  saving,
}: Props) {
  const [form, setForm] = useState<FormState>(empty());
  const [erro, setErro] = useState<string | null>(null);
  const { clientes, loading: loadingClientes } = useClientes();
  const { empresas, loading: loadingEmpresas } = useEmpresasRepresentadas();

  useEffect(() => {
    if (!isOpen) return;
    setErro(null);
    if (editing) {
      setForm(fromConta(editing));
    } else {
      const base = empty();
      // Pré-seleciona a primeira empresa ativa quando existir apenas uma
      const ativas = empresas.filter((e) => e.ativo);
      if (ativas.length === 1) base.empresa_representada_id = ativas[0].id!;
      setForm(base);
    }
  }, [isOpen, editing, empresas]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!form.empresa_representada_id) {
      setErro('Selecione a empresa.');
      return;
    }
    if (!form.descricao.trim()) {
      setErro('Descrição é obrigatória.');
      return;
    }
    const valor = Number(String(form.valor_original).replace(',', '.'));
    if (!valor || valor <= 0) {
      setErro('Informe um valor válido (maior que zero).');
      return;
    }
    if (!form.data_vencimento) {
      setErro('Informe a data de vencimento.');
      return;
    }

    const payload: ContaReceberInput = {
      empresa_representada_id: form.empresa_representada_id,
      descricao: form.descricao.trim(),
      numero_documento: form.numero_documento.trim() || null,
      cliente_id: form.cliente_id || null,
      valor_original: valor,
      data_emissao: form.data_emissao || null,
      data_vencimento: form.data_vencimento,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    };

    await onSubmit(payload, editing?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Empresa *</Label>
              <Select
                value={form.empresa_representada_id || undefined}
                onValueChange={(v) => set('empresa_representada_id', v)}
                disabled={loadingEmpresas}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas
                    .filter((e) => !!e.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id!}>
                        {e.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => set('descricao', e.target.value)}
                placeholder="Ex.: Mensalidade agosto/2026"
              />
            </div>

            <div className="space-y-2">
              <Label>Número do Documento</Label>
              <Input
                value={form.numero_documento}
                onChange={(e) => set('numero_documento', e.target.value)}
                placeholder="NF/Boleto/Recibo"
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id || '__none__'}
                onValueChange={(v) => set('cliente_id', v === '__none__' ? '' : v)}
                disabled={loadingClientes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem cliente</SelectItem>
                  {clientes
                    .filter((c: any) => !!c.id)
                    .map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Original (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valor_original}
                onChange={(e) => set('valor_original', e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as ContaReceberStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Em Aberto</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="RECEBIDO">Recebida</SelectItem>
                  <SelectItem value="VENCIDO">Vencida</SelectItem>
                  <SelectItem value="CANCELADO">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data de Emissão</Label>
              <Input
                type="date"
                value={form.data_emissao}
                onChange={(e) => set('data_emissao', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => set('data_vencimento', e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
              />
            </div>
          </div>

          {erro && (
            <div className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded p-2">
              {erro}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> {editing ? 'Atualizar' : 'Cadastrar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ContaReceberFormModal;
