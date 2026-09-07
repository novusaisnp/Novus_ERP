import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currencyUtils } from '@/utils/currencyUtils';
import { rollupPorConta } from '@/utils/planoContasTree';
import type { DmplContaLinha } from '@/types/relatoriosContabeis';

interface Props {
  linhas: DmplContaLinha[];
  maxNivel?: number;
}

export function DmplTable({ linhas, maxNivel = Infinity }: Props): JSX.Element {
  const totaisInicial = useMemo(() => rollupPorConta(linhas, (l) => l.saldoInicial), [linhas]);
  const totaisMovimento = useMemo(() => rollupPorConta(linhas, (l) => l.movimentoPeriodo), [linhas]);
  const totaisFinal = useMemo(() => rollupPorConta(linhas, (l) => l.saldoFinal), [linhas]);

  const filhosDe = (id: string | null) =>
    linhas.filter((l) => l.contaPaiId === id).sort((a, b) => a.codigo.localeCompare(b.codigo));

  const renderRow = (row: DmplContaLinha): React.ReactNode[] => {
    const todosFilhos = row.contaId ? filhosDe(row.contaId) : [];
    const filhos = row.nivel < maxNivel ? todosFilhos : [];
    const isHeader = todosFilhos.length > 0;
    const key = row.contaId ?? row.codigo;
    const ini = row.contaId ? totaisInicial.get(row.contaId) ?? 0 : row.saldoInicial;
    const mov = row.contaId ? totaisMovimento.get(row.contaId) ?? 0 : row.movimentoPeriodo;
    const fim = row.contaId ? totaisFinal.get(row.contaId) ?? 0 : row.saldoFinal;
    return [
      <TableRow key={key}>
        <TableCell style={{ paddingLeft: `${row.nivel * 20}px` }} className={isHeader ? 'font-semibold' : 'text-muted-foreground'}>
          {row.nome}
        </TableCell>
        <TableCell className={`text-right ${isHeader ? 'font-semibold' : ''}`}>{currencyUtils.formatCurrency(ini)}</TableCell>
        <TableCell className={`text-right ${isHeader ? 'font-semibold' : ''}`}>{currencyUtils.formatCurrency(mov)}</TableCell>
        <TableCell className={`text-right ${isHeader ? 'font-semibold' : ''}`}>{currencyUtils.formatCurrency(fim)}</TableCell>
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
      <TableHeader>
        <TableRow>
          <TableHead>Conta</TableHead>
          <TableHead className="text-right">Saldo Inicial</TableHead>
          <TableHead className="text-right">Movimento do Período</TableHead>
          <TableHead className="text-right">Saldo Final</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{raizes.flatMap((r) => renderRow(r))}</TableBody>
    </Table>
  );
}
