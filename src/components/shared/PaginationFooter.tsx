import { Button } from '@/components/ui/button';

interface PaginationFooterProps {
  page: number; // 0-based
  pageSize: number;
  total: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}

// Mesmo padrão do Kardex (src/pages/estoque/kardex/index.tsx) — referência de
// paginação server-side do repositório (AUDITORIA_NOVA Fase 5, Bloco 4).
export const PaginationFooter = ({
  page,
  pageSize,
  total,
  isFetching,
  onPageChange,
}: PaginationFooterProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground px-2 py-3">
      <div>
        {total > 0 ? (
          <>
            Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total}
          </>
        ) : (
          'Sem resultados'
        )}
        {isFetching && <span className="ml-2 italic">atualizando…</span>}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
};
