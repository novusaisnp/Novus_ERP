import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer } from 'lucide-react';
import type { Venda, ItemVenda } from '@/types/vendas';
import {
  calcItemVendaTotal,
  downloadVendaPdf,
  printVendaPdf,
  type VendaPdfCliente,
  type VendaPdfEmpresa,
} from '@/utils/vendaPdf';
import { resolveVendaPagamentoInfo } from '@/utils/vendaPagamentoInfo';

interface Props {
  venda: Venda | null;
  empresa?: VendaPdfEmpresa | null;
  cliente?: VendaPdfCliente | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  CONFIRMADO: 'Confirmado',
  EM_PRODUCAO: 'Em produção',
  FATURADO: 'Faturado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const VendaViewDialog: React.FC<Props> = ({
  venda,
  empresa,
  cliente,
  open,
  onOpenChange,
}) => {
  const pagamentoQ = useQuery({
    queryKey: ['venda-pagamento-info', venda?.id],
    queryFn: () => resolveVendaPagamentoInfo(venda as Venda),
    enabled: open && !!venda?.id,
  });

  if (!venda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Venda {venda.numero_venda ?? '-'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-start border-b pb-3 gap-4">
            <div className="flex items-start gap-3">
              {empresa?.logoUrl && (
                <img
                  src={empresa.logoUrl}
                  alt={`Logo ${empresa?.nome ?? ''}`}
                  className="h-16 w-auto object-contain"
                />
              )}
              <div>
                <div className="font-semibold text-base">
                  {empresa?.nome ?? 'Empresa'}
                </div>
                {empresa?.cnpj && (
                  <div className="text-muted-foreground text-xs">
                    CNPJ: {empresa.cnpj}
                  </div>
                )}
                {(empresa?.endereco || empresa?.cidade) && (
                  <div className="text-muted-foreground text-xs">
                    {[empresa?.endereco, empresa?.cidade, empresa?.estado]
                      .filter(Boolean)
                      .join(' - ')}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge>{STATUS_LABEL[venda.status] ?? venda.status}</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Emissão: {fmtDate(venda.data_venda)}
              </div>
              <div className="text-xs text-muted-foreground">
                Entrega prevista: {fmtDate(venda.data_entrega_prevista)}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                Nº {venda.numero_venda ?? '-'}
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-1">Cliente</div>
            <div>{cliente?.nome ?? venda.cliente?.nome ?? 'Não informado'}</div>
            {(cliente?.cnpj || cliente?.cpf) && (
              <div className="text-muted-foreground text-xs">
                Doc: {cliente?.cnpj ?? cliente?.cpf}
              </div>
            )}
            {(cliente?.email || cliente?.telefone) && (
              <div className="text-muted-foreground text-xs">
                {[cliente?.email, cliente?.telefone].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>

          {(() => {
            const itens = venda.itens ?? [];
            const produtos = itens.filter((i) => i.tipo_item !== 'S');
            const servicos = itens.filter((i) => i.tipo_item === 'S');
            const soma = (arr: ItemVenda[]) =>
              arr.reduce((s, i) => s + calcItemVendaTotal(i), 0);

            const Bloco = ({
              titulo,
              accent,
              arr,
            }: {
              titulo: string;
              accent: string;
              arr: ItemVenda[];
            }) =>
              arr.length === 0 ? null : (
                <div className="space-y-1">
                  <div className={`text-sm font-bold ${accent}`}>{titulo}</div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Descrição</th>
                          <th className="text-right p-2">Qtd</th>
                          <th className="text-right p-2">Unit.</th>
                          <th className="text-right p-2">Desc.</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arr.map((it, idx) => (
                          <tr key={it.id ?? idx} className="border-t">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2">{it.descricao}</td>
                            <td className="p-2 text-right">{it.quantidade}</td>
                            <td className="p-2 text-right">
                              {brl(Number(it.preco_unitario) || 0)}
                            </td>
                            <td className="p-2 text-right">
                              {brl(Number(it.desconto_item) || 0)}
                            </td>
                            <td className="p-2 text-right font-medium">
                              {brl(calcItemVendaTotal(it))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/60 font-semibold">
                          <td colSpan={5} className="p-2 text-right">
                            Subtotal {titulo}
                          </td>
                          <td className="p-2 text-right">{brl(soma(arr))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );

            if (itens.length === 0) {
              return (
                <div className="border rounded-md p-3 text-center text-muted-foreground text-xs">
                  Sem itens.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <Bloco titulo="Produtos" accent="text-slate-800" arr={produtos} />
                <Bloco titulo="Serviços" accent="text-teal-700" arr={servicos} />
              </div>
            );
          })()}

          <div className="flex justify-end">
            <div className="text-right space-y-0.5">
              <div className="text-xs text-muted-foreground">
                Subtotal: {brl(Number(venda.subtotal) || 0)}
              </div>
              {Number(venda.desconto) > 0 && (
                <div className="text-xs text-muted-foreground">
                  Desconto: -{brl(Number(venda.desconto))}
                </div>
              )}
              {Number(venda.acrescimo) > 0 && (
                <div className="text-xs text-muted-foreground">
                  Acréscimo: +{brl(Number(venda.acrescimo))}
                </div>
              )}
              {Number(venda.valor_frete) > 0 && (
                <div className="text-xs text-muted-foreground">
                  Frete: +{brl(Number(venda.valor_frete))}
                </div>
              )}
              <div className="text-xl font-bold">
                {brl(Number(venda.valor_total) || 0)}
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-1">Pagamento</div>
            {pagamentoQ.isLoading ? (
              <div className="text-muted-foreground text-xs">Carregando...</div>
            ) : !pagamentoQ.data || pagamentoQ.data.origem === 'nenhum' ? (
              <div className="text-muted-foreground text-xs">Forma de pagamento não informada.</div>
            ) : pagamentoQ.data.origem === 'plano' ? (
              <div className="text-muted-foreground text-xs space-y-0.5">
                <div>Plano: {pagamentoQ.data.planoNome}</div>
                {pagamentoQ.data.planoNaturezaNome && (
                  <div>Natureza: {pagamentoQ.data.planoNaturezaNome}</div>
                )}
                <div>
                  {pagamentoQ.data.planoQtdParcelas ?? 1}x prevista(s)
                  {pagamentoQ.data.planoDiasPrimeiraParcela != null &&
                    ` — 1ª parcela em ${pagamentoQ.data.planoDiasPrimeiraParcela} dias`}
                  {pagamentoQ.data.planoIntervaloDias != null &&
                    `, intervalo de ${pagamentoQ.data.planoIntervaloDias} dias`}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pagamentoQ.data.linhas.map((linha, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="text-muted-foreground">
                      Forma: {linha.modalidadeNome}
                      {linha.naturezaNome ? ` (${linha.naturezaNome})` : ''} —{' '}
                      {linha.qtdParcelas > 1 ? `${linha.qtdParcelas}x` : 'à vista'} —{' '}
                      {brl(linha.valorLiquido)}
                    </div>
                    {linha.parcelas.length > 1 && (
                      <div className="border rounded-md overflow-hidden mt-1">
                        <table className="w-full text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-1.5">Parcela</th>
                              <th className="text-left p-1.5">Vencimento</th>
                              <th className="text-right p-1.5">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linha.parcelas.map((p) => (
                              <tr key={p.numero} className="border-t">
                                <td className="p-1.5">
                                  {p.numero}
                                  {p.isEntrada ? ' (entrada)' : ''}
                                </td>
                                <td className="p-1.5">{fmtDate(p.dataVencimento)}</td>
                                <td className="p-1.5 text-right">{brl(p.valor)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {linha.parcelas.length === 1 && (
                      <div className="text-muted-foreground">
                        Vencimento: {fmtDate(linha.parcelas[0].dataVencimento)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {venda.observacoes && (
            <div>
              <div className="font-semibold mb-1">Observações</div>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {venda.observacoes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => printVendaPdf(venda, empresa, cliente)}
          >
            <Printer className="h-4 w-4 mr-1" /> Imprimir
          </Button>
          <Button onClick={() => downloadVendaPdf(venda, empresa, cliente)}>
            <Download className="h-4 w-4 mr-1" /> Baixar PDF
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
