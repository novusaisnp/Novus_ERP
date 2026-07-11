import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | string | null | undefined;
  onValueChange: (value: number) => void;
  locale?: string;
  currency?: string;
  allowNegative?: boolean;
}

/**
 * Input com máscara de moeda BRL (R$ 1.234,56).
 * Armazena o valor como number (float) via onValueChange.
 * Digitação livre: usuário digita apenas dígitos; formatação aplicada em tempo real.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onValueChange,
      locale = "pt-BR",
      currency = "BRL",
      allowNegative = false,
      className,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const formatter = React.useMemo(
      () =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      [locale, currency]
    );

    const numericValue = React.useMemo(() => {
      if (value === null || value === undefined || value === "") return 0;
      const n = typeof value === "number" ? value : parseFloat(String(value));
      return isNaN(n) ? 0 : n;
    }, [value]);

    const [display, setDisplay] = React.useState<string>(() =>
      numericValue ? formatter.format(numericValue) : ""
    );

    React.useEffect(() => {
      setDisplay(numericValue ? formatter.format(numericValue) : "");
    }, [numericValue, formatter]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const isNegative = allowNegative && raw.trim().startsWith("-");
      const digits = raw.replace(/\D/g, "");

      if (!digits) {
        setDisplay("");
        onValueChange(0);
        return;
      }

      let cents = parseInt(digits, 10);
      if (isNegative) cents = -cents;
      const next = cents / 100;

      setDisplay(formatter.format(next));
      onValueChange(next);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={(e) => {
          e.target.select();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setDisplay(numericValue ? formatter.format(numericValue) : "");
          onBlur?.(e);
        }}
        className={cn(className)}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
