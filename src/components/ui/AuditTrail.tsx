
import { useState, useEffect } from 'react';
import { History, User, Calendar, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { auditTrailService, type AuditEntry } from '@/services/auditTrailService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditTrailProps {
  tableName: string;
  recordId: string;
  entityName: string;
}

const operationLabels: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  ARCHIVE: 'Arquivamento',
  RESTORE: 'Restauração'
};

const operationColors: Record<string, string> = {
  CREATE: 'bg-status-delivered/15 text-status-delivered',
  UPDATE: 'bg-status-confirmed/15 text-status-confirmed',
  DELETE: 'bg-status-cancelled/15 text-status-cancelled',
  ARCHIVE: 'bg-status-production/15 text-status-production',
  RESTORE: 'bg-purple-100 text-purple-800'
};

/**
 * Componente para visualizar trilha de auditoria de qualquer entidade
 * Mostra histórico completo de operações realizadas no registro
 */
export const AuditTrail = ({ tableName, recordId, entityName }: AuditTrailProps) => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  console.log(`[AuditTrail] Componente para ${entityName} - Tabela: ${tableName}, ID: ${recordId}`);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const data = await auditTrailService.fetchAuditTrail(tableName, recordId);
      setAuditEntries(data);
    } catch (err) {
      console.error(`[AuditTrail] Erro inesperado:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditTrail();
    }
  }, [isOpen, tableName, recordId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Histórico
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Trilha de Auditoria - {entityName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Carregando histórico...</div>
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Nenhum histórico encontrado</div>
            </div>
          ) : (
            <div className="space-y-4">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <Badge className={operationColors[entry.operacao] || 'bg-status-draft/15 text-status-draft'}>
                        {operationLabels[entry.operacao] || entry.operacao}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(entry.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Usuário: {entry.usuario_id || 'Sistema'}
                    <span className="mx-2">|</span>
                    Origem: {entry.origem}
                  </div>

                  {(entry.dados_antigos || entry.dados_novos) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {entry.dados_antigos && (
                        <div>
                          <div className="font-medium text-sm mb-2">Dados Anteriores</div>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.dados_antigos, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.dados_novos && (
                        <div>
                          <div className="font-medium text-sm mb-2">Dados Novos</div>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.dados_novos, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
