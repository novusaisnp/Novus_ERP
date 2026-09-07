interface ContaComHierarquia {
  contaId: string | null;
  contaPaiId: string | null;
}

// Soma o valor da própria conta + de todas as descendentes (recursivo).
// Contas-header (aceita_lancamento=false) normalmente têm valor próprio 0 —
// somar mesmo assim é o que torna o cálculo correto também se algum dia
// isso deixar de ser verdade, em vez de assumir silenciosamente.
export function rollupPorConta<T extends ContaComHierarquia>(
  rows: T[],
  valorDe: (row: T) => number
): Map<string, number> {
  const porPai = new Map<string, T[]>();
  rows.forEach((r) => {
    if (r.contaPaiId) {
      const arr = porPai.get(r.contaPaiId) ?? [];
      arr.push(r);
      porPai.set(r.contaPaiId, arr);
    }
  });

  const cache = new Map<string, number>();
  const calc = (row: T): number => {
    if (!row.contaId) return valorDe(row);
    const cached = cache.get(row.contaId);
    if (cached !== undefined) return cached;
    const filhos = porPai.get(row.contaId) ?? [];
    const total = valorDe(row) + filhos.reduce((acc, f) => acc + calc(f), 0);
    cache.set(row.contaId, total);
    return total;
  };

  rows.forEach((r) => calc(r));
  return cache;
}

// Linhas prontas pra exibição/exportação num nível de corte: cada linha
// carrega seu total já rolado (soma de si + descendentes), e linhas mais
// fundas que maxNivel são descartadas — usado tanto pra visão Sintética
// (maxNivel baixo, ex. 1) quanto Analítica (maxNivel = Infinity, tudo).
export function linhasParaExibicao<T extends ContaComHierarquia & { nivel: number }>(
  rows: T[],
  valorDe: (row: T) => number,
  maxNivel: number
): Array<T & { valorExibido: number }> {
  const totais = rollupPorConta(rows, valorDe);
  return rows
    .filter((r) => r.nivel <= maxNivel)
    .map((r) => ({ ...r, valorExibido: r.contaId ? totais.get(r.contaId) ?? 0 : valorDe(r) }));
}
