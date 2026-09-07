import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';
import { usePedidosCompra } from '@/hooks/usePedidosCompra';
import { useFornecedores } from '@/hooks/useFornecedores';
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
  CANCELADO: { label: 'Cancelado', variant: 'destructive' },
};

const valorTotal = (p: PedidoCompra) => p.itens.reduce((acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario), 0);

const PedidosCompra: React.FC = () => {
  const { pedidos, isLoading } = usePedidosCompra();
  const { fornecedores } = useFornecedores();
  const navigate = useNavigate();

  const nomeFornecedor = (id: string) => {
    const f = fornecedores.find((x) => x.id === id);
    return f ? nomeDoFornecedor(f) : id.slice(0, 8);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Pedidos de Compra</h1>
        <p className="text-muted-foreground">Gerados a partir de cotações fechadas — aprovação por alçada antes de emitir</p>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}

      {!isLoading && pedidos.length === 0 && (
        <Card className="p-8 text-center">
          <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum pedido de compra ainda — gere um a partir de uma cotação fechada</p>
        </Card>
      )}

      <div className="space-y-3">
        {pedidos.map((p) => (
          <Card key={p.id} className="cursor-pointer hover:bg-accent/40" onClick={() => navigate(`/compras/pedidos/${p.id}`)}>
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{nomeFornecedor(p.fornecedor_id)}</span>
                  <Badge variant={statusBadge[p.status].variant}>{statusBadge[p.status].label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.itens.length} item(ns)</p>
              </div>
              <span className="font-semibold">{currencyUtils.formatCurrency(valorTotal(p))}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PedidosCompra;
