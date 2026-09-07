export type TipoContaContabil = 'ATIVO' | 'PASSIVO' | 'PATRIMONIO' | 'RECEITA' | 'DESPESA';
export type NaturezaContaContabil = 'DEVEDORA' | 'CREDORA';

interface ContaRelatorioBase {
  contaId: string | null;
  codigo: string;
  nome: string;
  tipo: TipoContaContabil;
  natureza: NaturezaContaContabil;
  nivel: number;
  contaPaiId: string | null;
  aceitaLancamento: boolean;
}

export interface BalancoContaLinha extends ContaRelatorioBase {
  saldo: number;
}

export interface DreContaLinha extends ContaRelatorioBase {
  valorPeriodo: number;
}
