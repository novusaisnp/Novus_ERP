/**
 * Testes de integração dos formulários migrados para CurrencyInput.
 *
 * Objetivo: validar o contrato de submissão — o valor `number` que chega no
 * handler após o usuário digitar através da máscara é exatamente o esperado.
 *
 * Estratégia: reproduzir o padrão real de uso (state controlado + handler de
 * submit) em um wrapper mínimo, evitando montar hooks/contexts pesados.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";

const NBSP = "\u00A0";
const brl = (s: string) => `R$${NBSP}${s}`;

describe("Integração — submissão de formulários com CurrencyInput", () => {
  it("ContasPagar: valor_original e valor_atual entregam number ao submit", async () => {
    const onSubmit = vi.fn();

    function FormContasPagar() {
      const [form, setForm] = useState({
        valor_original: 0,
        valor_atual: 0,
      });
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <label htmlFor="vo">Valor Original</label>
          <CurrencyInput
            id="vo"
            value={form.valor_original}
            onValueChange={(v) => setForm((p) => ({ ...p, valor_original: v }))}
          />
          <label htmlFor="va">Valor Atual</label>
          <CurrencyInput
            id="va"
            value={form.valor_atual}
            onValueChange={(v) => setForm((p) => ({ ...p, valor_atual: v }))}
          />
          <button type="submit">Salvar</button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<FormContasPagar />);

    await user.click(screen.getByLabelText("Valor Original"));
    await user.keyboard("150000"); // R$ 1.500,00
    await user.click(screen.getByLabelText("Valor Atual"));
    await user.keyboard("120050"); // R$ 1.200,50

    expect(screen.getByLabelText("Valor Original")).toHaveValue(brl("1.500,00"));
    expect(screen.getByLabelText("Valor Atual")).toHaveValue(brl("1.200,50"));

    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      valor_original: 1500,
      valor_atual: 1200.5,
    });
  });

  it("ContasReceber: valor_recebido opcional vira null quando 0", async () => {
    const onSubmit = vi.fn();

    function FormContasReceber() {
      const [form, setForm] = useState<{
        valor_original: number;
        valor_recebido: number | null;
      }>({ valor_original: 0, valor_recebido: null });
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <label htmlFor="vo">Valor Original</label>
          <CurrencyInput
            id="vo"
            value={form.valor_original}
            onValueChange={(v) => setForm((p) => ({ ...p, valor_original: v }))}
          />
          <label htmlFor="vr">Valor Recebido</label>
          <CurrencyInput
            id="vr"
            value={form.valor_recebido ?? 0}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, valor_recebido: v || null }))
            }
          />
          <button type="submit">Salvar</button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<FormContasReceber />);

    await user.click(screen.getByLabelText("Valor Original"));
    await user.keyboard("50000"); // R$ 500,00

    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      valor_original: 500,
      valor_recebido: null,
    });
  });

  it("Liquidação: valor_pago é number e nunca NaN mesmo após limpar", async () => {
    const onSubmit = vi.fn();

    function FormLiquidacao() {
      const [form, setForm] = useState({ valor_pago: 250.0 });
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <label htmlFor="vp">Valor a Pagar</label>
          <CurrencyInput
            id="vp"
            value={form.valor_pago}
            onValueChange={(v) => setForm({ valor_pago: v })}
          />
          <button type="submit">Liquidar</button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<FormLiquidacao />);

    const input = screen.getByLabelText("Valor a Pagar");
    expect(input).toHaveValue(brl("250,00"));

    await user.clear(input);
    await user.keyboard("99999"); // R$ 999,99

    await user.click(screen.getByRole("button", { name: /liquidar/i }));

    expect(onSubmit).toHaveBeenCalledWith({ valor_pago: 999.99 });
    expect(Number.isNaN((onSubmit.mock.calls[0][0] as any).valor_pago)).toBe(
      false,
    );
  });

  it("ContaBancaria: saldo_inicial aceita negativo quando allowNegative", async () => {
    const onSubmit = vi.fn();

    function FormConta() {
      const [form, setForm] = useState({ saldo_inicial: 0 });
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <label htmlFor="si">Saldo Inicial</label>
          <CurrencyInput
            id="si"
            allowNegative
            value={form.saldo_inicial}
            onValueChange={(v) => setForm({ saldo_inicial: v })}
          />
          <button type="submit">Criar</button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<FormConta />);

    const input = screen.getByLabelText("Saldo Inicial") as HTMLInputElement;

    // Simula digitação de valor negativo (o "-" é preservado por allowNegative)
    await user.click(input);
    // userEvent não permite "-" via keyboard como caractere isolado dentro
    // de um campo text que responde apenas a input events; usamos paste.
    await user.paste("-100000");

    expect(input.value).toBe(`-${brl("1.000,00")}`);

    await user.click(screen.getByRole("button", { name: /criar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ saldo_inicial: -1000 });
  });

  it("MovimentaçãoBancária: valor obrigatório bloqueia submit quando 0", async () => {
    const onSubmit = vi.fn();

    function FormMov() {
      const [valor, setValor] = useState(0);
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valor) return; // regra de negócio: valor > 0
            onSubmit({ valor });
          }}
        >
          <label htmlFor="v">Valor</label>
          <CurrencyInput
            id="v"
            value={valor}
            onValueChange={setValor}
            required
          />
          <button type="submit">Adicionar</button>
        </form>
      );
    }

    const user = userEvent.setup();
    render(<FormMov />);

    // 1º submit — valor zero → bloqueado
    await user.click(screen.getByRole("button", { name: /adicionar/i }));
    expect(onSubmit).not.toHaveBeenCalled();

    // 2º submit — com valor válido
    await user.click(screen.getByLabelText("Valor"));
    await user.keyboard("7500"); // R$ 75,00
    await user.click(screen.getByRole("button", { name: /adicionar/i }));
    expect(onSubmit).toHaveBeenCalledWith({ valor: 75 });
  });
});
