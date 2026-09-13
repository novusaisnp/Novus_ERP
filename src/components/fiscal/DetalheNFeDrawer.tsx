import { useState } from "react";
import { Download, ExternalLink, FileText, Ban, MailCheck, UserPlus, CircleCheck } from "lucide-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useFiscalDocumento, useFiscalEventos } from "@/hooks/fiscal/useFiscalDocumento";
import { useFiscalDocumentoRealtime } from "@/hooks/fiscal/useFiscalDocumentoRealtime";
import { getFiscalSignedUrl, getDanfeMockEnrichmentData } from "@/services/fiscal/emissaoService";
import { buildDanfeMockHtml, buildDanfceMockHtml, buildDamdfeMockHtml, buildMDFeMockXml, buildNFeMockXml, type DanfeMockData } from "@/utils/danfeMock";
import EventosTimeline from "./EventosTimeline";
import CancelarNFeDialog from "./CancelarNFeDialog";
import CartaCorrecaoDialog from "./CartaCorrecaoDialog";
import MDFeEventoDialog from "./MDFeEventoDialog";

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
    case 'falha_comunicacao':
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
  const [mdfeAcao, setMdfeAcao] = useState<'encerrar' | 'incluir_condutor' | null>(null);

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
    let pagamentos: DanfeMockData['pagamentos'] = [];
    let mdfe: DanfeMockData['mdfe'] = null;
    let naturezaOperacao: string | null = null;

    try {
      const enrichment = await getDanfeMockEnrichmentData({
        empresaRepresentadaId: d.empresa_representada_id,
        vendaId: d.venda_id,
        documentoId: d.id,
      });
      emitente = enrichment.emitente as DanfeMockData['emitente'];
      destinatario = enrichment.destinatario as DanfeMockData['destinatario'];
      naturezaOperacao = enrichment.naturezaOperacao;
      pagamentos = enrichment.pagamentos;
      mdfe = enrichment.mdfe as DanfeMockData['mdfe'];
      itens = enrichment.itens.map((r, i) => ({
        codigo: r.codigo ?? String(i + 1).padStart(3, '0'),
        descricao: r.descricao ?? '',
        quantidade: r.quantidade ?? 0,
        unidade: r.unidade ?? 'UN',
        preco_unitario: r.preco_unitario ?? 0,
        valor_total: r.valor_total_item ?? 0,
        ncm: r.ncm,
        cfop: r.cfop,
      }));
    } catch (err) {
      console.warn('[DANFE mock] falha ao enriquecer dados:', err);
    }

    return {
      tipo: d.tipo === 'NFCE' || d.tipo === 'MDFE' ? d.tipo : 'NFE',
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
      pagamentos,
      mdfe,
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
        const mdfe = documento.tipo === 'MDFE';
        downloadBlob(mdfe ? buildMDFeMockXml(mockData) : buildNFeMockXml(mockData), `${mdfe ? 'mdfe' : documento.tipo === 'NFCE' ? 'nfce' : 'nfe'}-mock-${chave}.xml`, 'application/xml');
      } else {
        const html = documento.tipo === 'NFCE'
          ? buildDanfceMockHtml(mockData)
          : documento.tipo === 'MDFE'
            ? buildDamdfeMockHtml(mockData)
            : buildDanfeMockHtml(mockData);
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
              {documento?.tipo === 'NFCE' ? 'NFC-e' : documento?.tipo === 'MDFE' ? 'MDF-e' : 'NF-e'} {documento?.numero ? `#${documento.numero}/${documento.serie}` : ''}
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
                {documento.forma_emissao === 'contingencia' && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    Em contingência
                  </Badge>
                )}
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
                {documento.forma_emissao === 'contingencia' && (
                  <Row label="Código único (cNF)" value={documento.codigo_unico_contingencia} />
                )}
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
                <Button variant="outline" onClick={() => handleOpenSigned(documento.danfe_url ?? documento.pdf_danfe_url, documento.tipo === 'NFCE' ? 'DANFCE' : documento.tipo === 'MDFE' ? 'DAMDFE' : 'DANFE')} disabled={!documento.danfe_url && !documento.pdf_danfe_url}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir {documento.tipo === 'NFCE' ? 'DANFCE' : documento.tipo === 'MDFE' ? 'DAMDFE' : 'DANFE'}
                </Button>

                {documento.status?.toLowerCase() === 'autorizada' && (
                  <div className="grid grid-cols-2 gap-2">
                    <PermissionGate codigo="fiscal.cancelarNfe">
                      <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                        <Ban className="h-4 w-4 mr-2" /> Cancelar
                      </Button>
                    </PermissionGate>
                    {documento.tipo === 'NFE' && (
                      <PermissionGate codigo="fiscal.cartaCorrecao">
                        <Button variant="secondary" onClick={() => setCceOpen(true)}>
                          <MailCheck className="h-4 w-4 mr-2" /> CC-e
                        </Button>
                      </PermissionGate>
                    )}
                    {documento.tipo === 'MDFE' && (
                      <PermissionGate codigo="fiscal.update">
                        <Button variant="secondary" onClick={() => setMdfeAcao('incluir_condutor')}><UserPlus className="h-4 w-4 mr-2" /> Condutor</Button>
                        <Button onClick={() => setMdfeAcao('encerrar')}><CircleCheck className="h-4 w-4 mr-2" /> Encerrar</Button>
                      </PermissionGate>
                    )}
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
        tipo={documento?.tipo}
      />
      <CartaCorrecaoDialog
        open={cceOpen}
        onOpenChange={setCceOpen}
        documentoId={documentoId}
        numero={documento?.numero ?? null}
        proximaSequencia={proxSeqCCe}
      />
      <MDFeEventoDialog
        open={!!mdfeAcao}
        onOpenChange={(open) => !open && setMdfeAcao(null)}
        documentoId={documentoId}
        acao={mdfeAcao ?? 'encerrar'}
      />
    </>
  );
};

export default DetalheNFeDrawer;
