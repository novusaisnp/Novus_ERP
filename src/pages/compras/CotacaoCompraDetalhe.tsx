import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Plus, X, Loader2, Link2, MessageCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCotacaoCompra } from '@/hooks/useCotacoesCompra';
import { usePedidosCompra } from '@/hooks/usePedidosCompra';
import { useRequisicoesCompra } from '@/hooks/useRequisicoesCompra';
import { useFornecedores } from '@/hooks/useFornecedores';
import { useProdutos } from '@/hooks/useProdutos';
import { PrecoCelula } from '@/components/compras/PrecoCelula';
import type { Fornecedor } from '@/types/fornecedor';
import type { CotacaoCompra } from '@/types/cotacaoCompra';

const nomeDoFornecedor = (f: Fornecedor) => f.razaoSocial || f.nomeFantasia || f.nome_completo || 'Fornecedor';

const linkPublicoDe = (conviteId: string) => `${window.location.origin}/cotar/${conviteId}`;

const statusBadge: Record<CotacaoCompra['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  ABERTA: { label: 'Aberta', variant: 'default' },
  FECHADA: { label: 'Fechada', variant: 'secondary' },
  CANCELADA: { label: 'Cancelada', variant: 'destructive' },
};

const CotacaoCompraDetalhe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    cotacao, isLoading, convidar, isConvidando, removerFornecedor,
    registrarPreco, isRegistrandoPreco, marcarVencedor, fechar, isFechando, cancelar, isCancelando,
  } = useCotacaoCompra(id);
  const { requisicoes } = useRequisicoesCompra();
  const { fornecedores } = useFornecedores();
  const { produtos } = useProdutos();
  const { pedidos, gerarDaCotacao, isGerando } = usePedidosCompra();

  const { toast } = useToast();
  const [convidarFornecedorId, setConvidarFornecedorId] = useState('');
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [linkCopiadoId, setLinkCopiadoId] = useState<string | null>(null);

  const copiarLink = async (conviteId: string) => {
    await navigator.clipboard.writeText(linkPublicoDe(conviteId));
    setLinkCopiadoId(conviteId);
    toast({ title: 'Link copiado' });
    setTimeout(() => setLinkCopiadoId((cur) => (cur === conviteId ? null : cur)), 2000);
  };

  const enviarPorWhatsApp = (conviteId: string, nomeFornecedorTxt: string) => {
    const texto = encodeURIComponent(
      `Olá, ${nomeFornecedorTxt}! Poderia cotar os itens abaixo? ${linkPublicoDe(conviteId)}`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  const requisicao = requisicoes.find((r) => r.id === cotacao?.requisicao_id);
  const nomeProduto = (produtoId: string) => produtos.find((p) => p.id === produtoId)?.nome || produtoId.slice(0, 8);
  const fornecedorPorId = new Map(fornecedores.map((f) => [f.id, f]));
  const fornecedoresConvidados = fornecedores.filter((f) => cotacao?.fornecedores.some((cf) => cf.fornecedor_id === f.id));
  const fornecedoresDisponiveis = fornecedores.filter((f) => !cotacao?.fornecedores.some((cf) => cf.fornecedor_id === f.id));

  const precoDe = (itemId: string, fornecedorId: string) =>
    cotacao?.precos.find((p) => p.requisicao_item_id === itemId && p.fornecedor_id === fornecedorId);

  const menorPrecoDoItem = (itemId: string): number | null => {
    const precos = (cotacao?.precos ?? []).filter((p) => p.requisicao_item_id === itemId);
    if (precos.length === 0) return null;
    // preco_unitario é `numeric` no Postgres — o Supabase-JS devolve como
    // string (evita perda de precisão), então precisa de Number() explícito
    // antes de comparar; sem isso "9.90" === 9.9 nunca bate.
    return Math.min(...precos.map((p) => Number(p.preco_unitario)));
  };

  const podeEditar = cotacao?.status === 'ABERTA';
  const pedidosDaCotacao = pedidos.filter((p) => p.cotacao_id === cotacao?.id);

  const handleConvidar = async () => {
    if (!convidarFornecedorId) return;
    await convidar(convidarFornecedorId);
    setConvidarFornecedorId('');
  };

  if (isLoading || !cotacao) {
    return <div className="container mx-auto px-6 py-8 text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/compras/cotacoes')} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />Voltar
        </Button>
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-primary">{requisicao?.justificativa || 'Cotação de Compra'}</h1>
              <Badge variant={statusBadge[cotacao.status].variant}>{statusBadge[cotacao.status].label}</Badge>
            </div>
            {cotacao.observacoes && <p className="text-muted-foreground text-sm">{cotacao.observacoes}</p>}
          </div>
          {podeEditar && (
            <div className="flex gap-2">
              <Button variant="outline" disabled={isCancelando} onClick={() => setConfirmCancelar(true)}>Cancelar Cotação</Button>
              <Button disabled={isFechando} onClick={() => setConfirmFechar(true)}>Fechar Cotação</Button>
            </div>
          )}
          {cotacao.status === 'FECHADA' && (
            <Button disabled={isGerando} onClick={() => gerarDaCotacao(cotacao.id)}>
              {isGerando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Gerar Pedido(s) de Compra
            </Button>
          )}
        </div>
      </div>

      {pedidosDaCotacao.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold text-sm">Pedidos de compra gerados</h2>
            {pedidosDaCotacao.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2 cursor-pointer hover:bg-accent/40"
                onClick={() => navigate(`/compras/pedidos/${p.id}`)}
              >
                <span>{fornecedorPorId.get(p.fornecedor_id) ? nomeDoFornecedor(fornecedorPorId.get(p.fornecedor_id)!) : p.fornecedor_id.slice(0, 8)}</span>
                <Badge variant="outline">{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Fornecedores convidados</h2>
            {podeEditar && (
              <div className="flex gap-2 items-center">
                <Select value={convidarFornecedorId || undefined} onValueChange={setConvidarFornecedorId}>
                  <SelectTrigger className="w-56 h-8 text-sm"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                  <SelectContent>
                    {fornecedoresDisponiveis.map((f) => <SelectItem key={f.id} value={f.id!}>{nomeDoFornecedor(f)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!convidarFornecedorId || isConvidando} onClick={handleConvidar}>
                  <Plus className="w-3 h-3 mr-1" />Convidar
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {cotacao.fornecedores.map((cf) => {
              const f = fornecedorPorId.get(cf.fornecedor_id);
              const nome = f ? nomeDoFornecedor(f) : cf.fornecedor_id.slice(0, 8);
              return (
                <div key={cf.id} className="flex items-center gap-2 flex-wrap text-sm border rounded-md px-2 py-1.5">
                  <span className="font-medium">{nome}</span>
                  {cf.respondido_em ? (
                    <Badge variant="default" className="gap-1"><Check className="w-3 h-3" />Respondeu</Badge>
                  ) : (
                    <Badge variant="outline">Aguardando</Badge>
                  )}
                  {podeEditar && (
                    <>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={() => copiarLink(cf.id)}>
                        <Link2 className="w-3 h-3 mr-1" />{linkCopiadoId === cf.id ? 'Copiado!' : 'Copiar link'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={() => enviarPorWhatsApp(cf.id, nome)}>
                        <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
                      </Button>
                      <button onClick={() => removerFornecedor(cf.id)} className="hover:text-destructive ml-auto">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {cotacao.fornecedores.length === 0 && <p className="text-xs text-muted-foreground">Nenhum fornecedor convidado ainda</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-sm mb-3">Mapa comparativo</h2>
          {fornecedoresConvidados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Convide ao menos um fornecedor pra começar a registrar preços.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Item</TableHead>
                    {fornecedoresConvidados.map((f) => (
                      <TableHead key={f.id} className="min-w-[130px]">{nomeDoFornecedor(f)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisicao?.itens.map((item) => {
                    const menorPreco = menorPrecoDoItem(item.id);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="align-top">
                          <p className="font-medium text-sm">{nomeProduto(item.produto_id)}</p>
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantidade}</p>
                        </TableCell>
                        {fornecedoresConvidados.map((f) => {
                          const preco = precoDe(item.id, f.id!);
                          return (
                            <TableCell key={f.id} className="align-top">
                              <PrecoCelula
                                preco={preco}
                                ehMenorPreco={!!preco && Number(preco.preco_unitario) === menorPreco}
                                podeEditar={!!podeEditar}
                                isSalvando={isRegistrandoPreco}
                                onSalvar={(precoUnitario, prazoEntregaDias) =>
                                  registrarPreco({
                                    cotacao_id: cotacao.id,
                                    requisicao_item_id: item.id,
                                    fornecedor_id: f.id!,
                                    preco_unitario: precoUnitario,
                                    prazo_entrega_dias: prazoEntregaDias,
                                  })
                                }
                                onMarcarVencedor={() => preco && marcarVencedor({ precoId: preco.id, itemId: item.id })}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmFechar}
        onOpenChange={setConfirmFechar}
        title="Fechar cotação?"
        description="Depois de fechada, não é mais possível convidar fornecedores ou registrar/editar preços."
        onConfirm={async () => { await fechar(); setConfirmFechar(false); }}
      />
      <ConfirmDialog
        open={confirmCancelar}
        onOpenChange={setConfirmCancelar}
        title="Cancelar cotação?"
        description="A cotação será marcada como cancelada e não poderá mais ser editada."
        onConfirm={async () => { await cancelar(); setConfirmCancelar(false); }}
      />
    </div>
  );
};

export default CotacaoCompraDetalhe;
