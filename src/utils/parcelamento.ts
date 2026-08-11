// FIN-E3: parcelamento determinístico (espelho da regra SQL)
export interface ParcelamentoInput {
  valorLiquido: number;
  qtdParcelas: number;
  percentualEntrada?: number;
  dataVenda: string; // YYYY-MM-DD
  diasPrimeiraParcela?: number;
  intervaloDias?: number;
  jurosAm?: number; // % a.m. destacado (não embutido)
}

export interface ParcelaCalculada {
  numero: number;
  valor: number;
  valor_juros: number;
  data_vencimento: string;
  is_entrada: boolean;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Gera parcelas determinísticas:
 * - entrada em D+0 quando percentualEntrada > 0 (parcela nº 1)
 * - demais parcelas em dataVenda + diasPrimeiraParcela + (k-2)*intervaloDias
 * - centavos residuais na última parcela (garante soma == valorLiquido)
 */
export function gerarParcelas(input: ParcelamentoInput): ParcelaCalculada[] {
  const {
    valorLiquido,
    qtdParcelas,
    percentualEntrada = 0,
    dataVenda,
    diasPrimeiraParcela = 30,
    intervaloDias = 30,
    jurosAm = 0,
  } = input;

  if (qtdParcelas < 1) throw new Error('qtdParcelas deve ser >= 1');
  if (valorLiquido < 0) throw new Error('valorLiquido inválido');

  const parcelas: ParcelaCalculada[] = [];

  const temEntrada = percentualEntrada > 0 && qtdParcelas >= 1;
  const entrada = temEntrada ? round2((valorLiquido * percentualEntrada) / 100) : 0;
  const restante = round2(valorLiquido - entrada);

  const qtdRestantes = temEntrada ? qtdParcelas - 1 : qtdParcelas;

  if (temEntrada) {
    parcelas.push({
      numero: 1,
      valor: entrada,
      valor_juros: 0,
      data_vencimento: dataVenda,
      is_entrada: true,
    });
  }

  if (qtdRestantes > 0) {
    // A parcela base trunca em centavos, nunca arredonda para cima. Arredondar fazia a soma
    // das parcelas iniciais estourar o total quando o valor era pequeno em relação ao numero
    // de parcelas, e a ultima parcela absorvia a diferenca ficando negativa
    // (R$ 0,03 em 6x virava 0,01 cinco vezes e -0,02 na ultima).
    const baseParcela = Math.floor(round2(restante) * 100 / qtdRestantes) / 100;
    let saldo = restante;

    for (let k = 1; k <= qtdRestantes; k++) {
      const numero = (temEntrada ? 1 : 0) + k;
      const isUltima = k === qtdRestantes;
      const valor = isUltima ? round2(saldo) : baseParcela;
      saldo = round2(saldo - valor);

      const juros = jurosAm > 0 ? round2((valor * jurosAm) / 100) : 0;

      const dataVencimento = addDaysISO(
        dataVenda,
        diasPrimeiraParcela + (k - 1) * intervaloDias,
      );

      parcelas.push({
        numero,
        valor,
        valor_juros: juros,
        data_vencimento: dataVencimento,
        is_entrada: false,
      });
    }
  }

  return parcelas;
}

export function somaParcelas(parcelas: Pick<ParcelaCalculada, 'valor'>[]): number {
  return round2(parcelas.reduce((acc, p) => acc + p.valor, 0));
}

export async function hashPayload(payload: unknown): Promise<string> {
  const text = JSON.stringify(payload);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // fallback (não criptográfico) — só em ambientes sem WebCrypto
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `fallback_${h}`;
}
