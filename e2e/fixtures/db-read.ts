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
  const rows = await restGet<{ id: string }>(page, `clientes?nome=eq.${encodeURIComponent(nome)}&select=id`);
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

