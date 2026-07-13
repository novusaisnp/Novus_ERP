import { ExternalLink, Download, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export interface FiscalDocumentoDetalhe {
  id: string;
  numero?: number | null;
  serie?: number | null;
  status: string;
  chave_acesso?: string | null;
  protocolo_autorizacao?: string | null;
  motivo_rejeicao?: string | null;
  codigo_status_sefaz?: string | null;
  xml_url?: string | null;
  danfe_url?: string | null;
  data_emissao?: string | null;
  valor_total?: number | null;
  provider?: string | null;
  ambiente?: string | null;
}

interface DetalheNFeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documento: FiscalDocumentoDetalhe | null;
}

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'autorizada': return 'default';
    case 'processando': return 'secondary';
    case 'cancelada':
    case 'denegada':
    case 'rejeitada':
    case 'erro':
      return 'destructive';
    default: return 'outline';
  }
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-start gap-4 text-sm py-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right break-all">{value ?? '—'}</span>
  </div>
);

const DetalheNFeDrawer = ({ open, onOpenChange, documento }: DetalheNFeDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            NF-e {documento?.numero ? `#${documento.numero}/${documento.serie}` : ''}
          </SheetTitle>
          <SheetDescription>Detalhes do documento fiscal eletrônico.</SheetDescription>
        </SheetHeader>

        {!documento ? (
          <p className="mt-6 text-sm text-muted-foreground">Nenhum documento selecionado.</p>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(documento.status)}>{documento.status}</Badge>
              {documento.ambiente && <Badge variant="outline">{documento.ambiente}</Badge>}
              {documento.provider && <Badge variant="outline">{documento.provider}</Badge>}
            </div>

            <Separator />

            <div>
              <Row label="Chave de acesso" value={documento.chave_acesso} />
              <Row label="Protocolo" value={documento.protocolo_autorizacao} />
              <Row label="Status SEFAZ" value={documento.codigo_status_sefaz} />
              <Row label="Data de emissão" value={documento.data_emissao ? new Date(documento.data_emissao).toLocaleString('pt-BR') : null} />
              <Row
                label="Valor total"
                value={
                  typeof documento.valor_total === 'number'
                    ? documento.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : null
                }
              />
            </div>

            {documento.motivo_rejeicao && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">Motivo</p>
                <p className="text-muted-foreground">{documento.motivo_rejeicao}</p>
              </div>
            )}

            <Separator />

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                disabled={!documento.xml_url}
                asChild={!!documento.xml_url}
              >
                {documento.xml_url ? (
                  <a href={documento.xml_url} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Baixar XML
                  </a>
                ) : (
                  <span>
                    <Download className="h-4 w-4 mr-2" /> XML indisponível
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={!documento.danfe_url}
                asChild={!!documento.danfe_url}
              >
                {documento.danfe_url ? (
                  <a href={documento.danfe_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir DANFE
                  </a>
                ) : (
                  <span>
                    <ExternalLink className="h-4 w-4 mr-2" /> DANFE indisponível
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DetalheNFeDrawer;
