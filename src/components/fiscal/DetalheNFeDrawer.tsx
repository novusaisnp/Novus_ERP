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

  const buildMockXml = () => {
    const d = documento!;
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DOCUMENTO SIMULADO (FISCAL_MOCK=true) — NÃO POSSUI VALIDADE FISCAL -->
<nfeProc versao="4.00">
  <NFe>
    <infNFe Id="NFe${d.chave_acesso ?? ''}">
      <ide><nNF>${d.numero ?? ''}</nNF><serie>${d.serie ?? ''}</serie><dhEmi>${d.data_emissao ?? ''}</dhEmi></ide>
      <total><ICMSTot><vNF>${d.valor_total ?? 0}</vNF></ICMSTot></total>
      <infAdic><infCpl>Documento gerado em modo simulação para validação de fluxo.</infCpl></infAdic>
    </infNFe>
  </NFe>
  <protNFe><infProt><nProt>${d.protocolo_autorizacao ?? 'MOCK'}</nProt><cStat>100</cStat></infProt></protNFe>
</nfeProc>`;
  };

  const buildMockDanfeHtml = () => {
    const d = documento!;
    const valor = typeof d.valor_total === 'number'
      ? d.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';
    return `<!doctype html><html><head><meta charset="utf-8"><title>DANFE Simulado</title>
<style>body{font-family:Arial,sans-serif;padding:32px;max-width:800px;margin:auto}
.watermark{position:fixed;top:40%;left:10%;font-size:96px;color:#eee;transform:rotate(-30deg);z-index:-1}
h1{border-bottom:2px solid #333}table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #999;padding:8px;text-align:left}</style></head>
<body><div class="watermark">SIMULAÇÃO</div>
<h1>DANFE — Documento Auxiliar da NF-e</h1>
<p><strong>⚠ Documento gerado em modo simulação (FISCAL_MOCK). Sem validade fiscal.</strong></p>
<table>
<tr><th>Nº / Série</th><td>${d.numero ?? '—'} / ${d.serie ?? '—'}</td></tr>
<tr><th>Chave de acesso</th><td>${d.chave_acesso ?? '—'}</td></tr>
<tr><th>Protocolo</th><td>${d.protocolo_autorizacao ?? '—'}</td></tr>
<tr><th>Emissão</th><td>${d.data_emissao ? new Date(d.data_emissao).toLocaleString('pt-BR') : '—'}</td></tr>
<tr><th>Status</th><td>${d.status ?? '—'}</td></tr>
<tr><th>Valor total</th><td>${valor}</td></tr>
</table>
<p style="margin-top:24px;color:#666;font-size:12px">Use Ctrl+P para salvar como PDF.</p>
</body></html>`;
  };

  const handleOpenSigned = async (url: string | null | undefined, label: string) => {
    if (!documento) return;
    if (!url) return;
    if (url.startsWith('mock://')) {
      const chave = documento.chave_acesso ?? documento.id;
      if (label === 'XML') {
        downloadBlob(buildMockXml(), `nfe-mock-${chave}.xml`, 'application/xml');
      } else {
        const win = window.open('', '_blank');
        if (win) { win.document.write(buildMockDanfeHtml()); win.document.close(); }
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
