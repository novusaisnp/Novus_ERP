import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { currencyUtils } from '@/utils/currencyUtils';
import { rollupPorConta } from '@/utils/planoContasTree';

interface LinhaBase {
  contaId: string | null;
  codigo: string;
  nome: string;
  nivel: number;
  contaPaiId: string | null;
}

interface Props<T extends LinhaBase> {
  linhas: T[];
  valorDe: (row: T) => number;
  // Sintético = só até este nível (subtotal já rolado dos filhos escondidos);
  // omitido/Infinity = analítico, desce até a conta-folha.
  maxNivel?: number;
}

export function ContaHierarquicaTable<T extends LinhaBase>({ linhas, valorDe, maxNivel = Infinity }: Props<T>): JSX.Element {
  const totais = useMemo(() => rollupPorConta(linhas, valorDe), [linhas, valorDe]);

  const filhosDe = (id: string | null) =>
    linhas
      .filter((l) => l.contaPaiId === id)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

  const renderRow = (row: T): React.ReactNode[] => {
    const todosFilhos = row.contaId ? filhosDe(row.contaId) : [];
    const filhos = row.nivel < maxNivel ? todosFilhos : [];
    const isHeader = todosFilhos.length > 0;
    const total = row.contaId ? totais.get(row.contaId) ?? 0 : valorDe(row);
    return [
      <TableRow key={row.contaId ?? row.codigo}>
        <TableCell
          style={{ paddingLeft: `${row.nivel * 20}px` }}
          className={isHeader ? 'font-semibold' : 'text-muted-foreground'}
        >
          {row.nome}
        </TableCell>
        <TableCell className={`text-right ${isHeader ? 'font-semibold' : ''}`}>
          {currencyUtils.formatCurrency(total)}
        </TableCell>
      </TableRow>,
      ...filhos.flatMap((f) => renderRow(f)),
    ];
  };

  const raizes = filhosDe(null);

  if (raizes.length === 0) {
    return <p className="text-muted-foreground py-6 text-center">Sem movimentação para exibir.</p>;
  }

  return (
    <Table>
      <TableBody>{raizes.flatMap((r) => renderRow(r))}</TableBody>
    </Table>
  );
}
