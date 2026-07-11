/**
 * [LOTE 3D] Suíte mínima de testes de hardening do domínio bancário.
 *
 * Cobre:
 *  1. mapBankingError prioriza `err.code` quando `err instanceof BankingError`.
 *  2. Saída sem saldo -> BankingError('SALDO_INSUFICIENTE').
 *  3. Estorno duplo -> BankingError('ESTORNO_DUPLICADO').
 *  4. Transferência inválida (origem=destino) -> BankingError('TRANSFERENCIA_INVALIDA').
 *  5. Invalidação de cache esperada no hook: detail(id) + stats(), sem
 *     `contasBancarias.all` raiz quando há contaId.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { BankingError, mapBankingError } from "@/lib/bankingErrors";
import { qk } from "@/lib/queryKeys";

// ---- Mock do supabase client usado pelo service ---------------------------

const { supabaseMock } = vi.hoisted(() => {
  const supabaseMock: any = {
    state: {
      contaSaldo: 100,
      contaStatus: "ATIVA" as string,
      estornado: false as boolean,
    },
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    rpc: (() => {
      const fn: any = async () => ({ data: null, error: null });
      fn.mock = { calls: [] as unknown[][] };
      return fn;
    })(),
    from: (table: string) => {
      const state = supabaseMock.state;
      const builder: any = {
        _op: "select",
        select: () => builder,
        insert: () => {
          builder._op = "insert";
          return builder;
        },
        update: () => {
          builder._op = "update";
          return builder;
        },
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        ilike: () => builder,
        or: () => builder,
        gte: () => builder,
        lte: () => builder,
        is: () => builder,
        maybeSingle: async () => {
          if (table === "movimentacoes_bancarias") {
            return {
              data: { id: "mov-1", estornado: state.estornado, ativo: true },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        single: async () => {
          if (table === "contas_bancarias") {
            return {
              data: {
                saldo_atual: state.contaSaldo,
                status: state.contaStatus,
                configuracoes: { permitir_saldo_negativo: false },
              },
              error: null,
            };
          }
          if (table === "movimentacoes_bancarias" && builder._op === "insert") {
            return {
              data: { id: "mov-new", conta_bancaria_id: "conta-A", tipo_movimentacao: "DEPOSITO" },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      };
      return builder;
    },
  };
  return { supabaseMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock,
}));

// Import DEPOIS do vi.mock para o service resolver o mock.
import {
  criarMovimentacaoBancaria,
  estornarMovimentacao,
  realizarTransferenciaBancaria,
} from "@/services/movimentacoesBancariasService";
import { useMovimentacoesBancarias } from "@/hooks/useMovimentacoesBancarias";

beforeEach(() => {
  supabaseMock.state.contaSaldo = 100;
  supabaseMock.state.contaStatus = "ATIVA";
  supabaseMock.state.estornado = false;
});

// ---- 1. mapBankingError prioriza err.code -------------------------------

describe("mapBankingError", () => {
  it("prioriza err.code de BankingError sobre substring da mensagem", () => {
    // mensagem contém 'TRANSFERENCIA_INVALIDA' mas o code é SALDO_INSUFICIENTE
    const err = new BankingError(
      "SALDO_INSUFICIENTE",
      "operação bloqueada — parece TRANSFERENCIA_INVALIDA mas é saldo"
    );
    const toast = mapBankingError(err);
    expect(toast.title).toBe("Saldo insuficiente");
    expect(toast.description).toMatch(/saldo suficiente/i);
  });

  it("faz fallback para substring em Error legado", () => {
    const err = new Error("ESTORNO_DUPLICADO: legado");
    const toast = mapBankingError(err);
    expect(toast.title).toBe("Estorno já realizado");
  });
});

// ---- 2. Saída sem saldo -------------------------------------------------

describe("criarMovimentacaoBancaria — saída sem saldo", () => {
  it("lança BankingError('SALDO_INSUFICIENTE')", async () => {
    supabaseMock.state.contaSaldo = 10;
    await expect(
      criarMovimentacaoBancaria({
        conta_bancaria_id: "conta-A",
        tipo_movimentacao: "SAQUE",
        valor: 500,
        data_movimentacao: "2026-01-01",
        descricao: "teste",
      } as any)
    ).rejects.toMatchObject({ code: "SALDO_INSUFICIENTE" });
  });
});

// ---- 3. Estorno duplo ---------------------------------------------------

describe("estornarMovimentacao — estorno duplo", () => {
  it("lança BankingError('ESTORNO_DUPLICADO')", async () => {
    supabaseMock.state.estornado = true;
    await expect(
      estornarMovimentacao({
        movimentacao_id: "mov-1",
        motivo_estorno: "teste",
      } as any)
    ).rejects.toMatchObject({ code: "ESTORNO_DUPLICADO" });
  });
});

// ---- 4. Transferência inválida (origem=destino) -------------------------

describe("realizarTransferenciaBancaria — origem=destino", () => {
  it("lança BankingError('TRANSFERENCIA_INVALIDA') antes de qualquer RPC", async () => {
    await expect(
      realizarTransferenciaBancaria({
        conta_origem_id: "conta-X",
        conta_destino_id: "conta-X",
        valor: 10,
        data_movimentacao: "2026-01-01",
        descricao: "teste",
      } as any)
    ).rejects.toMatchObject({ code: "TRANSFERENCIA_INVALIDA" });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

// ---- 5. Invalidação de cache esperada no hook ---------------------------

describe("useMovimentacoesBancarias — invalidação de cache", () => {
  it("com contaId conhecido, invalida detail(id)+stats() e NÃO invalida contasBancarias.all", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMovimentacoesBancarias(), { wrapper });

    // DEPOSITO não aciona checarSaldoParaSaida
    result.current.criar({
      conta_bancaria_id: "conta-A",
      tipo_movimentacao: "DEPOSITO",
      valor: 50,
      data_movimentacao: "2026-01-01",
      descricao: "deposito",
    } as any);

    await waitFor(() => expect(spy).toHaveBeenCalled());

    const calledKeys = spy.mock.calls.map((c) => (c[0] as any).queryKey);

    const includesKey = (target: readonly unknown[]) =>
      calledKeys.some(
        (k) => Array.isArray(k) && k.length === target.length && k.every((v, i) => v === target[i])
      );

    // Chaves esperadas presentes
    expect(includesKey(qk.contasBancarias.detail("conta-A"))).toBe(true);
    expect(includesKey(qk.contasBancarias.stats())).toBe(true);
    // Raiz de contasBancarias NÃO deve ser invalidada quando há contaId
    expect(includesKey(qk.contasBancarias.all)).toBe(false);
  });
});
