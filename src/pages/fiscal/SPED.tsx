import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { spedService } from '@/services/fiscal/spedService';
import { toast } from 'sonner';

const SpedPage = () => {
  const { data: arquivos = [], isLoading } = useQuery({ queryKey: ['fiscal-sped-arquivos'], queryFn: spedService.listar });

  const baixar = async (path: string) => {
    try {
      window.open(await spedService.urlDownload(path), '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Não foi possível baixar o arquivo SPED.');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SPED</h1>
        <p className="text-muted-foreground">Escriturações digitais e histórico de arquivos validados.</p>
      </div>

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Geração ainda bloqueada com segurança</CardTitle>
          <CardDescription>
            O ERP ainda não possui todos os registros contábeis e fiscais exigidos pelo leiaute oficial da EFD ICMS/IPI 3.2.2. Gerar um TXT parcial seria materialmente incorreto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Dependências internas restantes: cadastro do contabilista, código IBGE, perfil da escrituração, documentos de entrada, inventário, apuração e ajustes por UF.</p>
          <p>EFD-Contribuições seguirá apenas para fatos geradores até dezembro de 2026; a transição para CBS exige tratamento separado.</p>
          <Button disabled><FileSpreadsheet className="h-4 w-4 mr-2" />Gerar arquivo</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arquivos gerados</CardTitle>
          <CardDescription>Somente registros reais persistidos no banco; dados demonstrativos foram removidos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : arquivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum arquivo gerado.</p>
          ) : arquivos.map((arquivo) => (
            <div key={arquivo.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <div className="flex items-center gap-2"><strong>{arquivo.tipo.replace(/_/g, ' ')}</strong><Badge variant="outline">{arquivo.status}</Badge></div>
                <p className="text-sm text-muted-foreground">{arquivo.periodo_ini} a {arquivo.periodo_fim} · {arquivo.linhas_geradas ?? 0} linhas</p>
                {arquivo.erro_mensagem && <p className="text-sm text-destructive">{arquivo.erro_mensagem}</p>}
              </div>
              <Button variant="ghost" size="icon" disabled={!arquivo.arquivo_url} onClick={() => arquivo.arquivo_url && baixar(arquivo.arquivo_url)} aria-label="Baixar arquivo">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpedPage;
