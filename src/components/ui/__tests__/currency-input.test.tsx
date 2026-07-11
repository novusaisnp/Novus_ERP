import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CurrencyInput } from "../currency-input";

// NBSP usado pelo Intl.NumberFormat pt-BR entre "R$" e o número
const NBSP = "\u00A0";
const brl = (s: string) => `R$${NBSP}${s}`;

describe("CurrencyInput", () => {
  describe("valor inicial", () => {
    it("renderiza vazio quando value = 0", () => {
      render(<CurrencyInput value={0} onValueChange={() => {}} />);
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("renderiza vazio quando value = undefined/null", () => {
      render(<CurrencyInput value={undefined} onValueChange={() => {}} />);
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("formata valor inicial numérico", () => {
      render(<CurrencyInput value={1234.56} onValueChange={() => {}} />);
      expect(screen.getByRole("textbox")).toHaveValue(brl("1.234,56"));
    });

    it("sincroniza com atualização externa da prop value", () => {
      const { rerender } = render(
        <CurrencyInput value={10} onValueChange={() => {}} />
      );
      expect(screen.getByRole("textbox")).toHaveValue(brl("10,00"));
      rerender(<CurrencyInput value={50.25} onValueChange={() => {}} />);
      expect(screen.getByRole("textbox")).toHaveValue(brl("50,25"));
    });
  });

  describe("digitação (máscara em tempo real)", () => {
    function Controlled() {
      const [v, setV] = useState(0);
      return (
        <>
          <CurrencyInput value={v} onValueChange={setV} />
          <span data-testid="raw">{v}</span>
        </>
      );
    }

    it('digitar "5" produz R$ 0,05', async () => {
      const user = userEvent.setup();
      render(<Controlled />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("5");
      expect(input).toHaveValue(brl("0,05"));
      expect(screen.getByTestId("raw").textContent).toBe("0.05");
    });

    it('digitar "12345" produz R$ 123,45', async () => {
      const user = userEvent.setup();
      render(<Controlled />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("12345");
      expect(input).toHaveValue(brl("123,45"));
      expect(screen.getByTestId("raw").textContent).toBe("123.45");
    });

    it('digitar "100000" produz R$ 1.000,00', async () => {
      const user = userEvent.setup();
      render(<Controlled />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("100000");
      expect(input).toHaveValue(brl("1.000,00"));
      expect(screen.getByTestId("raw").textContent).toBe("1000");
    });

    it("ignora caracteres não numéricos ao digitar", async () => {
      const user = userEvent.setup();
      render(<Controlled />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("abc12");
      expect(input).toHaveValue(brl("0,12"));
      expect(screen.getByTestId("raw").textContent).toBe("0.12");
    });

    it("limpa para vazio quando todos os dígitos são removidos", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<CurrencyInput value={12.34} onValueChange={onValueChange} />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.clear(input);
      expect(input).toHaveValue("");
      expect(onValueChange).toHaveBeenLastCalledWith(0);
    });
  });

  describe("focus / blur", () => {
    it("seleciona o texto ao receber foco", async () => {
      const user = userEvent.setup();
      render(<CurrencyInput value={99.99} onValueChange={() => {}} />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      await user.click(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });

    it("no blur mantém display formatado", async () => {
      const user = userEvent.setup();
      render(<CurrencyInput value={7.5} onValueChange={() => {}} />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.tab();
      expect(input).toHaveValue(brl("7,50"));
    });

    it("no blur com valor 0 permanece vazio", async () => {
      const user = userEvent.setup();
      render(<CurrencyInput value={0} onValueChange={() => {}} />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.tab();
      expect(input).toHaveValue("");
    });

    it("chama onFocus e onBlur customizados", async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(
        <CurrencyInput
          value={1}
          onValueChange={() => {}}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      );
      const input = screen.getByRole("textbox");
      await user.click(input);
      expect(onFocus).toHaveBeenCalledTimes(1);
      await user.tab();
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe("negativos", () => {
    it("com allowNegative=false (default) ignora sinal", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<CurrencyInput value={0} onValueChange={onValueChange} />);
      const input = screen.getByRole("textbox");
      await user.click(input);
      await user.keyboard("-100");
      expect(input).toHaveValue(brl("1,00"));
      expect(onValueChange).toHaveBeenLastCalledWith(1);
    });

    it("com allowNegative=true aceita valor negativo", () => {
      const onValueChange = vi.fn();
      render(
        <CurrencyInput
          value={0}
          onValueChange={onValueChange}
          allowNegative
          data-testid="neg"
        />
      );
      const input = screen.getByTestId("neg") as HTMLInputElement;
      // Simula onChange do React com valor iniciando por "-"
      act(() => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )!.set!;
        setter.call(input, "-1");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(onValueChange).toHaveBeenLastCalledWith(-0.01);
    });
  });

  describe("props nativas", () => {
    it("propaga id, placeholder, disabled, readOnly, className", () => {
      render(
        <CurrencyInput
          value={0}
          onValueChange={() => {}}
          id="saldo"
          placeholder="R$ 0,00"
          disabled
          readOnly
          className="custom-class"
        />
      );
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.id).toBe("saldo");
      expect(input).toHaveAttribute("placeholder", "R$ 0,00");
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute("readonly");
      expect(input.className).toMatch(/custom-class/);
    });
  });

  describe("locale/currency override", () => {
    it("formata em USD/en-US", () => {
      render(
        <CurrencyInput
          value={1234.5}
          onValueChange={() => {}}
          locale="en-US"
          currency="USD"
        />
      );
      expect(screen.getByRole("textbox")).toHaveValue("$1,234.50");
    });
  });
});
