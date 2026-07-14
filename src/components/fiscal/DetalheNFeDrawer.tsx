import { useState } from "react";
import { Download, ExternalLink, FileText, Ban, MailCheck } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFiscalDocumento, useFiscalEventos } from "@/hooks/fiscal/useFiscalDocumento";
import { useFiscalDocumentoRealtime } from "@/hooks/fiscal/useFiscalDocumentoRealtime";
import { getFiscalSignedUrl } from "@/services/fiscal/emissaoService";
import { buildDanfeMockHtml, buildNFeMockXml, type DanfeMockData } from "@/utils/danfeMock";
import EventosTimeline from "./EventosTimeline";
import CancelarNFeDialog from "./CancelarNFeDialog";
import CartaCorrecaoDialog from "./CartaCorrecaoDialog";

interface DetalheNFeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string | null;
}

const statusVariant = (status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status?.toLowerCase()) {
    case 'autorizada': return 'default';
    case 'processando': return 'secondary';
    case 'em_processamento': return 'secondary';
    case 'cancelada':
    case 'denegada':
    case 'rejeitada':
    case 'erro': return 'destructive';
    default: return 'outline';
  }
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-start gap-4 text-sm py-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right break-all">{value ?? '—'}</span>
  </div>
);

const buildBucketPath = (url: string | null | undefined): { bucket: string; path: string } | null => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('mock://')) return null;
  const [bucket, ...rest] = url.split('/');
  if (!bucket || !rest.length) return null;
  return { bucket, path: rest.join('/') };
};

const DetalheNFeDrawer = ({ open, onOpenChange, documentoId }: DetalheNFeDrawerProps) => {
  const { data: documento, isLoading } = useFiscalDocumento(documentoId);
  const { data: eventos = [], isLoading: loadingEv } = useFiscalEventos(documentoId);
  useFiscalDocumentoRealtime(open ? documentoId : null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cceOpen, setCceOpen] = useState(false);

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  const loadMockData = async (): Promise<DanfeMockData> => {
    const d = documento!;
    let emitente: DanfeMockData['emitente'] = {};
    let destinatario: DanfeMockData['destinatario'] = {};
    let itens: DanfeMockData['itens'] = [];
    let naturezaOperacao: string | null = null;

    try {
      if (d.empresa_representada_id) {
        const { data: emp } = await supabase
          .from('empresas_representadas')
          .select('razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
          .eq('id', d.empresa_representada_id)
          .maybeSingle();
        if (emp) emitente = emp as DanfeMockData['emitente'];
      }
      if (d.venda_id) {
        const { data: venda } = await supabase
          .from('vendas')
          .select('cliente_id, natureza_operacao, observacoes')
          .eq('id', d.venda_id)
          .maybeSingle();
        naturezaOperacao = (venda as { natureza_operacao?: string | null } | null)?.natureza_operacao ?? null;
        const clienteId = (venda as { cliente_id?: string | null } | null)?.cliente_id;
        if (clienteId) {
          const { data: cli } = await supabase
            .from('clientes')
            .select('nome, razao_social, tipo_pessoa, cnpj, cpf, inscricao_estadual, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
            .eq('id', clienteId)
            .maybeSingle();
          if (cli) destinatario = cli as DanfeMockData['destinatario'];
        }
        const { data: rows } = await supabase
          .from('itens_venda')
          .select('descricao, quantidade, unidade, preco_unitario, valor_total_item, ordem')
          .eq('venda_id', d.venda_id)
          .order('ordem', { ascending: true });
        itens = (rows ?? []).map((r, i) => ({
          codigo: String(i + 1).padStart(3, '0'),
          descricao: (r as { descricao?: string | null }).descricao ?? '',
          quantidade: (r as { quantidade?: number | null }).quantidade ?? 0,
          unidade: (r as { unidade?: string | null }).unidade ?? 'UN',
          preco_unitario: (r as { preco_unitario?: number | null }).preco_unitario ?? 0,
          valor_total: (r as { valor_total_item?: number | null }).valor_total_item ?? 0,
          ncm: '00000000',
          cfop: '5102',
        }));
      }
    } catch (err) {
      console.warn('[DANFE mock] falha ao enriquecer dados:', err);
    }

    return {
      numero: d.numero,
      serie: d.serie,
      chave_acesso: d.chave_acesso,
      protocolo: d.protocolo_autorizacao,
      data_emissao: d.data_emissao,
      status: d.status,
      ambiente: d.ambiente,
      valor_total: d.valor_total,
      natureza_operacao: naturezaOperacao,
      emitente,
      destinatario,
      itens,
      observacoes: 'Documento sem validade fiscal — gerado em modo simulação para validação de fluxo.',
    };
  };

  const handleOpenSigned = async (url: string | null | undefined, label: string) => {
    if (!documento) return;
    if (!url) return;
    if (url.startsWith('mock://')) {
      const chave = documento.chave_acesso ?? documento.id;
      const mockData = await loadMockData();
      if (label === 'XML') {
        downloadBlob(buildNFeMockXml(mockData), `nfe-mock-${chave}.xml`, 'application/xml');
      } else {
        const html = buildDanfeMockHtml(mockData);
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
      }
      toast.info(`${label} simulado gerado (modo mock — sem validade fiscal).`);
      return;
    }
    if (url.startsWith('http')) { window.open(url, '_blank', 'noreferrer'); return; }
    const ref = buildBucketPath(url);
    if (!ref) { toast.error(`Não foi possível resolver o caminho do ${label}.`); return; }
    try {
      const { url: signed } = await getFiscalSignedUrl(ref.bucket, ref.path);
      window.open(signed, '_blank', 'noreferrer');
    } catch (err) {
      toast.error(`Falha ao gerar link do ${label}: ${(err as Error).message}`);
    }
  };

  const proxSeqCCe = 1 + eventos.filter((e) => e.tipo === 'cce').reduce((m, e) => Math.max(m, e.sequencia ?? 0), 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              NF-e {documento?.numero ? `#${documento.numero}/${documento.serie}` : ''}
            </SheetTitle>
            <SheetDescription>Detalhes do documento fiscal eletrônico.</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
          ) : !documento ? (
            <p className="mt-6 text-sm text-muted-foreground">Documento não encontrado.</p>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusVariant(documento.status)}>{documento.status}</Badge>
                {documento.ambiente && <Badge variant="outline">{documento.ambiente}</Badge>}
                {documento.provider && <Badge variant="outline">{documento.provider}</Badge>}
              </div>

              <Separator />

              <div>
                <Row label="Chave de acesso" value={documento.chave_acesso} />
                <Row label="Protocolo" value={documento.protocolo_autorizacao} />
                <Row label="Status SEFAZ" value={documento.codigo_status_sefaz} />
                <Row label="Emissão" value={documento.data_emissao ? new Date(documento.data_emissao).toLocaleString('pt-BR') : null} />
                <Row
                  label="Valor total"
                  value={typeof documento.valor_total === 'number'
                    ? documento.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : null}
                />
                <Row label="Tentativas" value={documento.tentativas} />
              </div>

              {documento.motivo_rejeicao && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Motivo</p>
                  <p className="text-muted-foreground">{documento.motivo_rejeicao}</p>
                </div>
              )}

              <Separator />

              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => handleOpenSigned(documento.xml_url, 'XML')} disabled={!documento.xml_url}>
                  <Download className="h-4 w-4 mr-2" /> Baixar XML
                </Button>
                <Button variant="outline" onClick={() => handleOpenSigned(documento.danfe_url ?? documento.pdf_danfe_url, 'DANFE')} disabled={!documento.danfe_url && !documento.pdf_danfe_url}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir DANFE
                </Button>

                {documento.status?.toLowerCase() === 'autorizada' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                      <Ban className="h-4 w-4 mr-2" /> Cancelar NF-e
                    </Button>
                    <Button variant="secondary" onClick={() => setCceOpen(true)}>
                      <MailCheck className="h-4 w-4 mr-2" /> CC-e
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">Linha do tempo</p>
                <EventosTimeline eventos={eventos} loading={loadingEv} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <CancelarNFeDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        documentoId={documentoId}
        numero={documento?.numero ?? null}
      />
      <CartaCorrecaoDialog
        open={cceOpen}
        onOpenChange={setCceOpen}
        documentoId={documentoId}
        numero={documento?.numero ?? null}
        proximaSequencia={proxSeqCCe}
      />
    </>
  );
};

export default DetalheNFeDrawer;
