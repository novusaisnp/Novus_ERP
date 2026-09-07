import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface ItemRequisicao {
  id: string;
  quantidade: number;
  produto: { nome: string } | null;
}

interface ConviteData {
  id: string;
  respondido_em: string | null;
  cotacao: {
    id: string;
    status: 'ABERTA' | 'FECHADA' | 'CANCELADA';
    requisicao: { justificativa: string; itens: ItemRequisicao[] };
  };
}

interface EmpresaResumo {
  nome: string | null;
  cnpj: string | null;
  logoUrl: string | null;
}

interface PrecoExistente {
  requisicao_item_id: string;
  preco_unitario: number;
  prazo_entrega_dias: number | null;
  observacao: string | null;
}

interface LinhaForm {
  preco_unitario: string;
  prazo_entrega_dias: string;
  observacao: string;
}

type RespostaGet =
  | { requiresVerification: true; fornecedorNome: string; tipoDocumento: 'CNPJ' | 'CPF'; empresa: EmpresaResumo }
  | { requiresVerification: false; convite: ConviteData; empresa: EmpresaResumo; precos: PrecoExistente[] }
  | { error: string };

const fmtCnpjCpf = (digits: string, tipo: 'CNPJ' | 'CPF') => {
  if (tipo === 'CPF') return digits.slice(0, 11);
  return digits.slice(0, 14);
};

const CabecalhoEmpresa: React.FC<{ empresa: EmpresaResumo | null }> = ({ empresa }) => {
  if (!empresa) return null;
  return (
    <div className="flex items-center gap-3 justify-center pb-4 mb-4 border-b">
      {empresa.logoUrl && <img src={empresa.logoUrl} alt={empresa.nome || ''} className="h-10 w-auto object-contain" />}
      <div className="text-left">
        <p className="font-semibold text-sm">{empresa.nome}</p>
        {empresa.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {empresa.cnpj}</p>}
      </div>
    </div>
  );
};

const CotacaoFornecedorPublica: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaResumo | null>(null);

  // Portão de verificação — pedido explícito do usuário: mesmo o link sendo
  // um token imprevisível, exigir confirmar o próprio documento evita que um
  // link colado/enviado pro fornecedor errado revele dados sem essa checagem.
  const [precisaVerificar, setPrecisaVerificar] = useState(true);
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [documento, setDocumento] = useState('');
  const [verificando, setVerificando] = useState(false);

  const [convite, setConvite] = useState<ConviteData | null>(null);
  const [form, setForm] = useState<Record<string, LinhaForm>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const carregar = async (documentoTentativa?: string) => {
    if (!id) return;
    setLoading(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke('compras-cotacao-publica', {
      body: { action: 'get', convite_id: id, documento: documentoTentativa },
    });
    if (error) {
      setErro('Não foi possível carregar esta cotação. Verifique se o link está correto.');
      setLoading(false);
      return;
    }
    const payload = data as RespostaGet;
    if ('error' in payload) {
      setErro(payload.error);
      setLoading(false);
      return;
    }
    setEmpresa(payload.empresa);
    if (payload.requiresVerification) {
      setPrecisaVerificar(true);
      setFornecedorNome(payload.fornecedorNome);
      setTipoDocumento(payload.tipoDocumento);
      if (documentoTentativa) setErro('Documento não confere — confira e tente novamente.');
      setLoading(false);
      return;
    }
    setPrecisaVerificar(false);
    const dados = payload as { requiresVerification: false; convite: ConviteData; empresa: EmpresaResumo; precos: PrecoExistente[] };
    setConvite(dados.convite);
    const precosPorItem = new Map(dados.precos.map((p) => [p.requisicao_item_id, p]));
    const initialForm: Record<string, LinhaForm> = {};
    dados.convite.cotacao.requisicao.itens.forEach((item) => {
      const existente = precosPorItem.get(item.id);
      initialForm[item.id] = {
        preco_unitario: existente ? String(existente.preco_unitario) : '',
        prazo_entrega_dias: existente?.prazo_entrega_dias != null ? String(existente.prazo_entrega_dias) : '',
        observacao: existente?.observacao || '',
      };
    });
    setForm(initialForm);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const confirmarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificando(true);
    await carregar(documento);
    setVerificando(false);
  };

  const setLinha = (itemId: string, patch: Partial<LinhaForm>) =>
    setForm((p) => ({ ...p, [itemId]: { ...p[itemId], ...patch } }));

  const enviar = async () => {
    if (!convite) return;
    const itens = Object.entries(form)
      .filter(([, linha]) => linha.preco_unitario)
      .map(([requisicao_item_id, linha]) => ({
        requisicao_item_id,
        preco_unitario: Number(linha.preco_unitario),
        prazo_entrega_dias: linha.prazo_entrega_dias ? Number(linha.prazo_entrega_dias) : null,
        observacao: linha.observacao || null,
      }));
    if (itens.length === 0) {
      setErro('Preencha o preço de pelo menos um item.');
      return;
    }
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.functions.invoke('compras-cotacao-publica', {
      body: { action: 'submit', convite_id: convite.id, documento, itens },
    });
    setEnviando(false);
    const payload = data as { ok?: boolean; error?: string } | null;
    if (error || payload?.error) {
      setErro(payload?.error || 'Erro ao enviar sua cotação. Tente novamente.');
      return;
    }
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6">
      <div className="w-full max-w-2xl space-y-6 mt-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Cotação de Preços</h1>
          <p className="text-muted-foreground text-sm">Preencha o preço e prazo de entrega dos itens abaixo</p>
        </div>

        {loading && (
          <Card><CardContent className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />Carregando…
          </CardContent></Card>
        )}

        {!loading && erro && !empresa && (
          <Card><CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-2" />
            <p className="text-sm">{erro}</p>
          </CardContent></Card>
        )}

        {!loading && empresa && precisaVerificar && (
          <Card>
            <CardContent className="p-6">
              <CabecalhoEmpresa empresa={empresa} />
              <div className="text-center mb-4">
                <ShieldCheck className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="font-medium">Cotação endereçada a {fornecedorNome}</p>
                <p className="text-sm text-muted-foreground">
                  Pra sua segurança, confirme o {tipoDocumento} da sua empresa pra abrir a cotação.
                </p>
              </div>
              <form onSubmit={confirmarDocumento} className="space-y-3 max-w-xs mx-auto">
                <Input
                  autoFocus
                  value={documento}
                  onChange={(e) => setDocumento(fmtCnpjCpf(e.target.value.replace(/\D/g, ''), tipoDocumento))}
                  placeholder={tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  inputMode="numeric"
                />
                {erro && <p className="text-sm text-destructive text-center">{erro}</p>}
                <Button type="submit" className="w-full" disabled={verificando || !documento}>
                  {verificando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar e continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {!loading && convite && !precisaVerificar && enviado && (
          <Card><CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <p className="font-medium">Cotação enviada com sucesso!</p>
            <p className="text-sm text-muted-foreground mt-1">Obrigado, {fornecedorNome}. Recebemos sua resposta.</p>
          </CardContent></Card>
        )}

        {!loading && convite && !precisaVerificar && !enviado && convite.cotacao.status !== 'ABERTA' && (
          <Card><CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Esta cotação já foi encerrada e não aceita mais respostas.</p>
          </CardContent></Card>
        )}

        {!loading && convite && !precisaVerificar && !enviado && convite.cotacao.status === 'ABERTA' && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <CabecalhoEmpresa empresa={empresa} />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Para</p>
                <p className="font-medium">{fornecedorNome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Referente a</p>
                <p>{convite.cotacao.requisicao.justificativa}</p>
              </div>

              <div className="space-y-3 pt-2 border-t">
                {convite.cotacao.requisicao.itens.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px] gap-2 items-end">
                    <div>
                      <p className="font-medium text-sm">{item.produto?.nome || 'Item'}</p>
                      <p className="text-xs text-muted-foreground">Quantidade: {item.quantidade}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Preço unitário (R$)</label>
                      <Input
                        type="number" step="0.01" min={0.01}
                        value={form[item.id]?.preco_unitario || ''}
                        onChange={(e) => setLinha(item.id, { preco_unitario: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Prazo (dias)</label>
                      <Input
                        type="number" min={0}
                        value={form[item.id]?.prazo_entrega_dias || ''}
                        onChange={(e) => setLinha(item.id, { prazo_entrega_dias: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}

              <Button className="w-full" disabled={enviando} onClick={enviar}>
                {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar Cotação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CotacaoFornecedorPublica;
