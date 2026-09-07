import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePedidosCompra } from '@/hooks/usePedidosCompra';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useProdutos } from '@/hooks/useProdutos';
import { useRecebimentosCompra } from '@/hooks/useRecebimentosCompra';
import { ConfirmarRecebimentoDialog } from '@/components/compras/ConfirmarRecebimentoDialog';
import { currencyUtils } from '@/utils/currencyUtils';
import type { Fornecedor } from '@/types/fornecedor';
import type { PedidoCompra } from '@/types/pedidoCompra';

const nomeDoFornecedor = (f: Fornecedor) => f.razaoSocial || f.nomeFantasia || f.nome_completo || 'Fornecedor';

const statusBadge: Record<PedidoCompra['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  RASCUNHO: { label: 'Rascunho', variant: 'outline' },
  AGUARDANDO_APROVACAO: { label: 'Aguardando aprovação', variant: 'secondary' },
  APROVADO: { label: 'Aprovado', variant: 'default' },
  REJEITADO: { label: 'Rejeitado', variant: 'destructive' },
  EMITIDO: { label: 'Emitido', variant: 'default' },
  RECEBIDO: { label: 'Recebido', variant: 'default' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive' },
};

const PedidoCompraDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    pedidos, isLoading, enviarParaAprovacao, isEnviandoParaAprovacao,
    marcarEmitido, isMarcandoEmitido, cancelar, isCancelando,
  } = usePedidosCompra();
  const { fornecedores } = useFornecedores();
  const { produtos } = useProdutos();
  const { recebimentos, confirmar: confirmarRecebimento, isConfirmando } = useRecebimentosCompra(id);

  const [confirmEnviar, setConfirmEnviar] = useState(false);
  const [confirmEmitir, setConfirmEmitir] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [recebimentoDialogOpen, setRecebimentoDialogOpen] = useState(false);

  const pedido = pedidos.find((p) => p.id === id);
  const fornecedor = fornecedores.find((f) => f.id === pedido?.fornecedor_id);
  const nomeProduto = (produtoId: string) => produtos.find((p) => p.id === produtoId)?.nome || produtoId.slice(0, 8);

  const jaRecebidoPorItem = recebimentos.reduce<Record<string, number>>((acc, rec) => {
    for (const it of rec.itens) {
      acc[it.pedido_item_id] = (acc[it.pedido_item_id] || 0) + Number(it.quantidade_recebida);
    }
    return acc;
  }, {});

  if (isLoading || !pedido) {
    return <div className="container mx-auto px-6 py-8 text-muted-foreground">Carregando…</div>;
  }

  const valorTotal = pedido.itens.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario), 0);

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/compras/pedidos')} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />Voltar
        </Button>
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-primary">{fornecedor ? nomeDoFornecedor(fornecedor) : 'Pedido de Compra'}</h1>
              <Badge variant={statusBadge[pedido.status].variant}>{statusBadge[pedido.status].label}</Badge>
            </div>
            {pedido.status === 'AGUARDANDO_APROVACAO' && (
              <p className="text-sm text-muted-foreground">Aguardando decisão na Central de Aprovações</p>
            )}
            {pedido.status === 'REJEITADO' && (
              <p className="text-sm text-destructive">Pedido rejeitado — confira o motivo na Central de Aprovações</p>
            )}
          </div>
          <div className="flex gap-2">
            {pedido.status === 'RASCUNHO' && (
              <>
                <Button variant="outline" disabled={isCancelando} onClick={() => setConfirmCancelar(true)}>Cancelar</Button>
                <Button disabled={isEnviandoParaAprovacao} onClick={() => setConfirmEnviar(true)}>
                  {isEnviandoParaAprovacao && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar para Aprovação
                </Button>
              </>
            )}
            {pedido.status === 'AGUARDANDO_APROVACAO' && (
              <Button variant="outline" disabled={isCancelando} onClick={() => setConfirmCancelar(true)}>Cancelar</Button>
            )}
            {pedido.status === 'REJEITADO' && (
              <Button variant="outline" disabled={isCancelando} onClick={() => setConfirmCancelar(true)}>Cancelar</Button>
            )}
            {pedido.status === 'APROVADO' && (
              <Button disabled={isMarcandoEmitido} onClick={() => setConfirmEmitir(true)}>
                {isMarcandoEmitido && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Marcar como Emitido
              </Button>
            )}
            {pedido.status === 'EMITIDO' && (
              <Button onClick={() => setRecebimentoDialogOpen(true)}>Confirmar Recebimento</Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm mb-3">Itens</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço unitário</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{nomeProduto(it.produto_id)}</TableCell>
                  <TableCell className="text-right">{it.quantidade}</TableCell>
                  <TableCell className="text-right">{currencyUtils.formatCurrency(Number(it.preco_unitario))}</TableCell>
                  <TableCell className="text-right">{currencyUtils.formatCurrency(Number(it.quantidade) * Number(it.preco_unitario))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end pt-3 mt-3 border-t">
            <span className="font-semibold">Total: {currencyUtils.formatCurrency(valorTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {recebimentos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold text-sm mb-3">Recebimentos</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recebimentos.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>{new Date(rec.data_recebimento).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      {rec.itens.map((it) => `${nomeProduto(it.produto_id)}: ${it.quantidade_recebida}`).join(', ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{rec.observacoes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pedido.status === 'RECEBIDO' && pedido.contas_pagar_id && (
              <p className="text-sm text-muted-foreground pt-3 mt-3 border-t">
                Pedido totalmente recebido — título a pagar gerado automaticamente no Financeiro.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmarRecebimentoDialog
        pedido={pedido}
        jaRecebidoPorItem={jaRecebidoPorItem}
        nomeProduto={nomeProduto}
        open={recebimentoDialogOpen}
        onClose={() => setRecebimentoDialogOpen(false)}
        onConfirm={async (itens, observacoes) => { await confirmarRecebimento({ itens, observacoes }); }}
        isConfirming={isConfirmando}
      />

      <ConfirmDialog
        open={confirmEnviar}
        onOpenChange={setConfirmEnviar}
        title="Enviar para aprovação?"
        description="O pedido deixa de ser editável. Se houver alçada configurada para a categoria COMPRA acima deste valor, alguém com a alçada precisa aprovar antes de emitir."
        onConfirm={async () => { await enviarParaAprovacao(pedido.id); setConfirmEnviar(false); }}
      />
      <ConfirmDialog
        open={confirmEmitir}
        onOpenChange={setConfirmEmitir}
        title="Marcar como emitido?"
        description="Confirma que o pedido já foi enviado de fato ao fornecedor (e-mail/WhatsApp/telefone)."
        onConfirm={async () => { await marcarEmitido(pedido.id); setConfirmEmitir(false); }}
      />
      <ConfirmDialog
        open={confirmCancelar}
        onOpenChange={setConfirmCancelar}
        title="Cancelar pedido?"
        description="O pedido será marcado como cancelado e não poderá mais ser editado ou enviado."
        onConfirm={async () => { await cancelar(pedido.id); setConfirmCancelar(false); }}
      />
    </div>
  );
};

export default PedidoCompraDetalhe;
