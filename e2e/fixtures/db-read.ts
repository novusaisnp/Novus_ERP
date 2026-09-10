/**
 * Helpers de asserção contra o DB para testes E2E.
 * Usa REST via PostgREST com o access_token do usuário autenticado
 * (extraído do localStorage do Playwright).
 */
import type { Page } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i) ?? '';
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const parsed = JSON.parse(window.localStorage.getItem(key) ?? '{}');
          return parsed?.access_token ?? '';
        } catch { /* ignore */ }
      }
    }
    return '';
  });
  if (!token) throw new Error('access_token não encontrado no localStorage');
  return token;
}

async function restGet<T = unknown>(page: Page, path: string): Promise<T[]> {
  const token = await getAccessToken(page);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`REST ${path} falhou: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

export interface ContaReceberRow {
  id: string;
  saldo_devedor: number | null;
  situacao?: string;
}

export interface MovimentacaoBancariaRow {
  id: string;
  conciliado: boolean | null;
  valor: number | null;
}

export async function readContasReceberByCliente(page: Page, clienteId: string): Promise<ContaReceberRow[]> {
  return restGet<ContaReceberRow>(
    page,
    `contas_receber?cliente_id=eq.${clienteId}&select=id,saldo_devedor,situacao`,
  );
}

export async function readMovimentacoesByOrigem(page: Page, tituloId: string): Promise<MovimentacaoBancariaRow[]> {
  return restGet<MovimentacaoBancariaRow>(
    page,
    `movimentacoes_bancarias?origem_id=eq.${tituloId}&select=id,conciliado,valor`,
  );
}

export async function readClienteIdByNome(page: Page, nome: string): Promise<string | null> {
  // Desde o Cadastro Unificado de Entidades não existe mais uma tabela `clientes`
  // dedicada — cliente é uma entidade com o papel CLIENTE, e `nome` (== razão
  // social para PJ) já identifica o registro criado neste teste.
  const rows = await restGet<{ id: string }>(page, `entidades?nome=eq.${encodeURIComponent(nome)}&select=id`);
  return rows[0]?.id ?? null;
}

export async function readVendaIdByCliente(page: Page, clienteId: string): Promise<string | null> {
  const rows = await restGet<{ id: string }>(
    page,
    `vendas?cliente_id=eq.${clienteId}&order=created_at.desc&limit=1&select=id`,
  );
  return rows[0]?.id ?? null;
}

// ================ F3 - Conciliação ================

export interface ExtratoImportadoRow {
  id: string;
  status: string;
  total_lancamentos: number | null;
  nome_arquivo: string | null;
}

export interface LinhaExtratoRow {
  id: string;
  status_conciliacao: string;
  valor: number | null;
  data_movimento: string | null;
  movimentacao_bancaria_id: string | null;
}

export interface ContaBancariaLiteRow {
  id: string;
  descricao: string | null;
}

export async function readExtratoById(page: Page, extratoId: string): Promise<ExtratoImportadoRow | null> {
  const rows = await restGet<ExtratoImportadoRow>(
    page,
    `banco_extratos_importados?id=eq.${extratoId}&select=id,status,total_lancamentos,nome_arquivo`,
  );
  return rows[0] ?? null;
}

export async function readLinhasExtrato(page: Page, extratoId: string): Promise<LinhaExtratoRow[]> {
  return restGet<LinhaExtratoRow>(
    page,
    `banco_movimentacoes_extrato?extrato_importado_id=eq.${extratoId}&select=id,status_conciliacao,valor,data_movimento,movimentacao_bancaria_id`,
  );
}

export async function readFirstContaBancaria(page: Page): Promise<ContaBancariaLiteRow | null> {
  const rows = await restGet<ContaBancariaLiteRow>(
    page,
    `contas_bancarias?deleted_at=is.null&select=id,descricao&limit=1`,
  );
  return rows[0] ?? null;
}

// ================ F4 - Produto & Estoque ================

export interface ProdutoLiteRow {
  id: string;
  nome: string;
  estoque_atual: number | null;
}

export interface EstoqueMovLiteRow {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  data_movimento: string;
}

export interface EstoqueSaldoLiteRow {
  produto_id: string;
  localizacao_id: string;
  quantidade: number;
}

export async function readProdutoByNome(page: Page, nome: string): Promise<ProdutoLiteRow | null> {
  const rows = await restGet<ProdutoLiteRow>(
    page,
    `produtos?nome=eq.${encodeURIComponent(nome)}&select=id,nome,estoque_atual&limit=1`,
  );
  return rows[0] ?? null;
}

export async function readMovimentacoesByProduto(
  page: Page,
  produtoId: string,
): Promise<EstoqueMovLiteRow[]> {
  return restGet<EstoqueMovLiteRow>(
    page,
    `estoque_movimentacoes?produto_id=eq.${produtoId}&deleted_at=is.null&select=id,produto_id,tipo,quantidade,data_movimento&order=data_movimento.desc`,
  );
}

export async function readSaldosByProduto(
  page: Page,
  produtoId: string,
): Promise<EstoqueSaldoLiteRow[]> {
  return restGet<EstoqueSaldoLiteRow>(
    page,
    `estoque_saldos?produto_id=eq.${produtoId}&select=produto_id,localizacao_id,quantidade`,
  );
}

export async function readMovimentacoesRecentes(
  page: Page,
  limit = 20,
): Promise<EstoqueMovLiteRow[]> {
  return restGet<EstoqueMovLiteRow>(
    page,
    `estoque_movimentacoes?deleted_at=is.null&select=id,produto_id,tipo,quantidade,data_movimento&order=data_movimento.desc&limit=${limit}`,
  );
}




// ================ F5 - Regras de Conciliação ================

export interface RegraConciliacaoLiteRow {
  id: string;
  nome: string;
  tipo: string;
  padrao: string | null;
  ativa: boolean | null;
  prioridade: number | null;
}

export async function readRegraByNome(
  page: Page,
  nome: string,
): Promise<RegraConciliacaoLiteRow | null> {
  const rows = await restGet<RegraConciliacaoLiteRow>(
    page,
    `banco_regras_conciliacao?nome=eq.${encodeURIComponent(nome)}&deleted_at=is.null&select=id,nome,tipo,padrao,ativa,prioridade&limit=1`,
  );
  return rows[0] ?? null;
}

export async function readRegraByNomeIncludingDeleted(
  page: Page,
  nome: string,
): Promise<Array<RegraConciliacaoLiteRow & { deleted_at: string | null }>> {
  return restGet<RegraConciliacaoLiteRow & { deleted_at: string | null }>(
    page,
    `banco_regras_conciliacao?nome=eq.${encodeURIComponent(nome)}&select=id,nome,tipo,padrao,ativa,prioridade,deleted_at`,
  );
}
