import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';
import { ContasReceberForm } from './ContasReceberForm';
import { RateioManager } from '@/components/financeiro/contas-pagar/RateioManager';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import type {
  ContaReceber,
  ContaReceberInput,
  RateioContaReceber,
} from '@/types/contasReceber';
import type { RateioContaPagar } from '@/types/contasPagar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ContaReceberInput, id?: string) => Promise<void> | void;
  editing?: ContaReceber | null;
  saving?: boolean;
}

const hoje = () => new Date().toISOString().slice(0, 10);

const empty = (): ContaReceberInput => ({
  empresa_representada_id: '',
  cliente_id: null,
  descricao: '',
  numero_documento: '',
  valor_original: 0,
  valor_recebido: null,
  valor_desconto: null,
  data_emissao: hoje(),
  data_vencimento: hoje(),
  data_competencia: null,
  status: 'PENDENTE',
  plano_conta_id: null,
  centro_custo_id: null,
  observacoes: null,
  recorrente: false,
  periodicidade: null,
  numero_parcela: null,
  total_parcelas: null,
  rateios: [],
});

const fromConta = (c: ContaReceber): ContaReceberInput => ({
  empresa_representada_id: c.empresa_representada_id || '',
  cliente_id: c.cliente_id || null,
  descricao: c.descricao || '',
  numero_documento: c.numero_documento || '',
  valor_original: Number(c.valor_original ?? 0),
  valor_recebido: c.valor_recebido ?? null,
  valor_desconto: c.valor_desconto ?? null,
  data_emissao: c.data_emissao || hoje(),
  data_vencimento: c.data_vencimento || hoje(),
  data_competencia: null,
  status: c.status || 'PENDENTE',
  plano_conta_id: c.plano_conta_id ?? null,
  centro_custo_id: c.centro_custo_id ?? null,
  observacoes: c.observacoes ?? null,
  recorrente: false,
  periodicidade: null,
  numero_parcela: c.numero_parcela ?? null,
  total_parcelas: c.total_parcelas ?? null,
  rateios: (c.rateios || []).map((r) => ({
    id: r.id,
    plano_conta_id: r.plano_conta_id ?? '',
    centro_custo_id: r.centro_custo_id ?? null,
    valor: Number(r.valor),
    percentual: Number(r.percentual),
    observacoes: r.observacoes ?? null,
  })),
});

export function ContaReceberFormModal({
  isOpen,
  onClose,
  onSubmit,
  editing,
  saving,
}: Props) {
  const [form, setForm] = useState<ContaReceberInput>(empty());
  const [useRateio, setUseRateio] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { empresas } = useEmpresasRepresentadas();

  useEffect(() => {
    if (!isOpen) return;
    setErro(null);
    if (editing) {
      const base = fromConta(editing);
      setForm(base);
      setUseRateio((base.rateios?.length ?? 0) > 0);
    } else {
      const base = empty();
      const ativas = empresas.filter((e) => e.ativo);
      if (ativas.length === 1) base.empresa_representada_id = ativas[0].id!;
      setForm(base);
      setUseRateio(false);
    }
  }, [isOpen, editing, empresas]);

  const handleChange = <K extends keyof ContaReceberInput>(
    field: K,
    value: ContaReceberInput[K],
  ) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleRateiosChange = (rateios: RateioContaReceber[]) =>
    setForm((prev) => ({ ...prev, rateios }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!form.empresa_representada_id) return setErro('Selecione a empresa.');
    if (!form.descricao?.trim()) return setErro('Descrição é obrigatória.');
    if (!form.numero_documento?.trim())
      return setErro('Número do documento é obrigatório.');
    const valor = Number(form.valor_original);
    if (!valor || valor <= 0)
      return setErro('Informe um valor válido (maior que zero).');
    if (!form.data_vencimento) return setErro('Informe a data de vencimento.');

    if (useRateio) {
      if (!form.rateios || form.rateios.length === 0)
        return setErro('Adicione ao menos um rateio ou desative o rateio.');
      const soma = form.rateios.reduce((s, r) => s + Number(r.valor || 0), 0);
      if (Math.abs(soma - valor) > 0.01)
        return setErro(
          'A soma dos rateios não confere com o valor original.',
        );
      if (form.rateios.some((r) => !r.plano_conta_id))
        return setErro('Todo rateio precisa de conta contábil.');
    }

    const payload: ContaReceberInput = {
      ...form,
      descricao: form.descricao.trim(),
      numero_documento: form.numero_documento?.trim() || null,
      observacoes: form.observacoes?.toString().trim() || null,
      rateios: useRateio ? form.rateios : [],
    };

    await onSubmit(payload, editing?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do título a receber, classifique contabilmente e,
            se necessário, aplique rateio entre contas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ContasReceberForm
            formData={form}
            onInputChange={handleChange}
            useRateio={useRateio}
            onUseRateioChange={setUseRateio}
            onRateiosChange={handleRateiosChange}
          />

          {erro && (
            <div className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded p-2">
              {erro}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />{' '}
                  {editing ? 'Atualizar' : 'Cadastrar'}
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
