// FIN-E3: UI técnica mínima da camada de pagamento
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, PlayCircle, Trash2, Loader2 } from 'lucide-react';
import { useVendaPagamento } from '@/hooks/useVendaPagamento';
import { usePagamentoModalidades, usePagamentoNaturezas } from '@/hooks/usePagamentoCatalogo';
import { cn } from '@/lib/utils';

interface Props {
  vendaId: string;
  empresaId: string;
  clienteId?: string | null;
  valorTotalVenda: number;
  dataVenda: string; // YYYY-MM-DD
  canEdit?: boolean;
}

export const VendaPagamentoSection: React.FC<Props> = ({
  vendaId,
  empresaId,
  valorTotalVenda,
  dataVenda,
  canEdit = true,
}) => {
  const { pagamentos, parcelasByPagamento, validacao, loading, criarPagamento, removerPagamento, validar } =
    useVendaPagamento(vendaId);
  const { data: modalidades = [] } = usePagamentoModalidades(true);
  const { data: naturezas = [] } = usePagamentoNaturezas(true);

  const somaLinhas = useMemo(
    () => pagamentos.reduce((acc, p) => acc + Number(p.valor_liquido || 0), 0),
    [pagamentos],
  );
  const restante = Math.max(0, Number((valorTotalVenda - somaLinhas).toFixed(2)));

  const [modalidadeId, setModalidadeId] = useState<string>('');
  const [naturezaId, setNaturezaId] = useState<string>('');
  const [valorBruto, setValorBruto] = useState<string>('');
  const [qtdParcelas, setQtdParcelas] = useState<string>('1');
  const [diasPrimeira, setDiasPrimeira] = useState<string>('30');
  const [intervalo, setIntervalo] = useState<string>('30');
  const [pctEntrada, setPctEntrada] = useState<string>('0');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!modalidadeId || !valorBruto) return;
    setSaving(true);
    const ok = await criarPagamento(
      {
        empresa_representada_id: empresaId,
        venda_id: vendaId,
        modalidade_id: modalidadeId,
        natureza_id: naturezaId || null,
        valor_bruto: Number(valorBruto),
        qtd_parcelas: Math.max(1, Number(qtdParcelas || 1)),
        percentual_entrada: Number(pctEntrada || 0),
      },
      {
        dataVenda,
        diasPrimeiraParcela: Number(diasPrimeira || 30),
        intervaloDias: Number(intervalo || 30),
        percentualEntrada: Number(pctEntrada || 0),
        qtdParcelas: Math.max(1, Number(qtdParcelas || 1)),
      },
    );
    setSaving(false);
    if (ok) {
      setValorBruto('');
      setQtdParcelas('1');
      setPctEntrada('0');
    }
  };

  const modalidadeNome = (id: string) => modalidades.find((m) => m.id === id)?.nome ?? id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Pagamentos da Venda
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Total da venda</div>
            <div className="text-lg font-medium">R$ {valorTotalVenda.toFixed(2)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Soma pagamentos</div>
            <div className="text-lg font-medium">R$ {somaLinhas.toFixed(2)}</div>
          </div>
          <div className={cn(
            'rounded-md border p-3',
            restante > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/10',
          )}>
            <div className="text-muted-foreground">Restante</div>
            <div className="text-lg font-medium">R$ {restante.toFixed(2)}</div>
          </div>
        </div>

        {canEdit && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end border-t pt-4">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Modalidade</Label>
              <Select value={modalidadeId} onValueChange={setModalidadeId}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {modalidades.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">Natureza</Label>
              <Select value={naturezaId} onValueChange={setNaturezaId}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {naturezas.map((n) => (<SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <CurrencyInput
                value={Number(valorBruto) || 0}
                onValueChange={(v) => setValorBruto(v ? String(v) : '')}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Parcelas</Label>
              <Input type="number" min={1} value={qtdParcelas} onChange={(e) => setQtdParcelas(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">1ª parc. (dias)</Label>
              <Input type="number" min={0} value={diasPrimeira} onChange={(e) => setDiasPrimeira(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Intervalo (dias)</Label>
              <Input type="number" min={0} value={intervalo} onChange={(e) => setIntervalo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entrada (%)</Label>
              <Input type="number" min={0} max={100} step="0.1" value={pctEntrada} onChange={(e) => setPctEntrada(e.target.value)} />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button type="button" onClick={handleAdd} disabled={saving || !modalidadeId || !valorBruto}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar pagamento
              </Button>
            </div>
          </div>
        )}

        {pagamentos.length > 0 && (
          <div className="space-y-4">
            {pagamentos.map((p) => (
              <div key={p.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{modalidadeNome(p.modalidade_id)}</Badge>
                    <Badge>{p.status}</Badge>
                    <span className="text-sm font-medium">R$ {Number(p.valor_liquido).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{p.qtd_parcelas}x</span>
                    {p.externo_id && (
                      <Badge variant="secondary" className="text-xs">ext: {p.origem_sistema}/{p.externo_id}</Badge>
                    )}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => removerPagamento(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Juros</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(parcelasByPagamento[p.id] ?? []).map((pp) => (
                      <TableRow key={pp.id}>
                        <TableCell>{pp.numero}{pp.is_entrada && ' (entrada)'}</TableCell>
                        <TableCell>{pp.data_vencimento}</TableCell>
                        <TableCell>R$ {Number(pp.valor).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(pp.valor_juros).toFixed(2)}</TableCell>
                        <TableCell>{pp.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Contas a receber será gerado apenas em FIN-E5.
          </div>
          <Button type="button" variant="outline" onClick={validar}>
            <PlayCircle className="h-4 w-4 mr-1" />
            Validar pagamento
          </Button>
        </div>

        {validacao && (
          <div className={cn(
            'rounded-md border p-3 text-sm',
            validacao.ok
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-destructive/40 bg-destructive/10',
          )}>
            <div className="font-medium">
              {validacao.ok ? 'Validação OK' : `Validação falhou (${validacao.erros.length} erro(s))`}
            </div>
            {validacao.erros.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1">
                {validacao.erros.map((e, i) => (
                  <li key={i}><code className="text-xs">{e.codigo}</code> — {e.mensagem}</li>
                ))}
              </ul>
            )}
            {validacao.avisos.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
                {validacao.avisos.map((a, i) => (
                  <li key={i}><code className="text-xs">{a.codigo}</code> — {a.mensagem}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
