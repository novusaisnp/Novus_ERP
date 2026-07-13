import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { useCheckDependencias } from '@/hooks/useCheckDependencias';

interface ConfirmDeleteWithDepsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entidade: string;
  id: string | null;
  nomeRegistro?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export const ConfirmDeleteWithDeps: React.FC<ConfirmDeleteWithDepsProps> = ({
  open,
  onOpenChange,
  entidade,
  id,
  nomeRegistro,
  onConfirm,
  loading = false,
}) => {
  const { data, isLoading, isError, error } = useCheckDependencias(entidade, open ? id : null);

  const bloqueantes = data?.dependencias.filter((d) => d.bloqueia && d.count > 0) ?? [];
  const informativos = data?.dependencias.filter((d) => !d.bloqueia && d.count > 0) ?? [];
  const bloqueado = !!data && !data.pode_excluir;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            {nomeRegistro ? (
              <>Você está prestes a excluir <strong>{nomeRegistro}</strong>.</>
            ) : (
              'Você está prestes a excluir este registro.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando dependências...
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao verificar dependências</AlertTitle>
              <AlertDescription>{(error as Error)?.message ?? 'Falha desconhecida'}</AlertDescription>
            </Alert>
          )}

          {data && data.total_dependentes === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum vínculo encontrado. Esta ação não pode ser desfeita.
            </p>
          )}

          {bloqueantes.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Exclusão bloqueada — existem vínculos</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {bloqueantes.map((d) => (
                    <li key={d.tabela} className="flex items-center justify-between gap-2">
                      <span>{d.label}</span>
                      <Badge variant="destructive">{d.count}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  Remova ou transfira estes vínculos antes de excluir.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {informativos.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Itens que serão removidos/desvinculados em cascata</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {informativos.map((d) => (
                    <li key={d.tabela} className="flex items-center justify-between gap-2">
                      <span>
                        {d.label}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({d.on_delete === 'CASCADE' ? 'cascade' : 'desvincula'})
                        </span>
                      </span>
                      <Badge variant="secondary">{d.count}</Badge>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!bloqueado && !isLoading) onConfirm();
            }}
            disabled={bloqueado || isLoading || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar exclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
