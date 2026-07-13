// P15.3 — Formulário CRUD de Regras de Conciliação
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useCriarRegra,
  useAtualizarRegra,
  useLookupNaturezas,
  useLookupPlanoContas,
  useLookupCentrosCusto,
} from "@/hooks/conciliacao/useConciliacao";
import type {
  RegraConciliacao,
  RegraConciliacaoInput,
  TipoRegra,
  ContraparteTipo,
} from "@/types/conciliacao";

const NONE = "__none__";

const schema = z
  .object({
    nome: z.string().trim().min(1, "Nome obrigatório").max(120),
    prioridade: z.coerce.number().int().min(0).max(9999),
    ativa: z.boolean(),
    tipo: z.enum(["PALAVRA_CHAVE", "VALOR_EXATO", "REGEX", "CONTRAPARTE"]),
    padrao: z.string().trim().max(500).nullable(),
    tolerancia_valor: z.coerce.number().min(0).max(1_000_000),
    tolerancia_dias: z.coerce.number().int().min(0).max(365),
    natureza_id: z.string().nullable(),
    plano_conta_id: z.string().nullable(),
    centro_custo_id: z.string().nullable(),
    contraparte_tipo: z.enum(["CLIENTE", "FORNECEDOR"]).nullable(),
    contraparte_id: z.string().nullable(),
    observacoes: z.string().trim().max(1000).nullable(),
  })
  .superRefine((val, ctx) => {
    if ((val.tipo === "PALAVRA_CHAVE" || val.tipo === "REGEX") && !val.padrao) {
      ctx.addIssue({
        code: "custom",
        path: ["padrao"],
        message: "Padrão obrigatório para este tipo",
      });
    }
    if (val.tipo === "REGEX" && val.padrao) {
      try {
        new RegExp(val.padrao);
      } catch {
        ctx.addIssue({ code: "custom", path: ["padrao"], message: "Regex inválida" });
      }
    }
    if (val.tipo === "CONTRAPARTE" && !val.contraparte_tipo) {
      ctx.addIssue({
        code: "custom",
        path: ["contraparte_tipo"],
        message: "Selecione o tipo de contraparte",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  regra?: RegraConciliacao | null;
}

function toForm(r?: RegraConciliacao | null): FormValues {
  return {
    nome: r?.nome ?? "",
    prioridade: r?.prioridade ?? 100,
    ativa: r?.ativa ?? true,
    tipo: (r?.tipo as TipoRegra) ?? "PALAVRA_CHAVE",
    padrao: r?.padrao ?? null,
    tolerancia_valor: r?.tolerancia_valor ?? 0,
    tolerancia_dias: r?.tolerancia_dias ?? 0,
    natureza_id: r?.natureza_id ?? null,
    plano_conta_id: r?.plano_conta_id ?? null,
    centro_custo_id: r?.centro_custo_id ?? null,
    contraparte_tipo: (r?.contraparte_tipo as ContraparteTipo | null) ?? null,
    contraparte_id: r?.contraparte_id ?? null,
    observacoes: r?.observacoes ?? null,
  };
}

export function RegraForm({ open, onOpenChange, regra }: Props) {
  const criar = useCriarRegra();
  const atualizar = useAtualizarRegra();
  const naturezas = useLookupNaturezas();
  const planos = useLookupPlanoContas();
  const centros = useLookupCentrosCusto();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toForm(regra),
  });

  useEffect(() => {
    form.reset(toForm(regra));
  }, [regra, open, form]);

  const tipo = form.watch("tipo");
  const contraparteTipo = form.watch("contraparte_tipo");

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = values as unknown as RegraConciliacaoInput;
    try {
      if (regra) {
        await atualizar.mutateAsync({ id: regra.id, input: payload });
      } else {
        await criar.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      /* toast já exibido pelos hooks */
    }
  });

  const saving = criar.isPending || atualizar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-regra">
        <DialogHeader>
          <DialogTitle>{regra ? "Editar regra" : "Nova regra"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" data-testid="regra-input-nome" {...form.register("nome")} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.nome.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="prioridade">Prioridade *</Label>
              <Input id="prioridade" type="number" {...form.register("prioridade")} />
            </div>

            <div className="flex items-end gap-2">
              <Switch
                id="ativa"
                checked={form.watch("ativa")}
                onCheckedChange={(v) => form.setValue("ativa", v)}
              />
              <Label htmlFor="ativa">Ativa</Label>
            </div>

            <div>
              <Label>Tipo *</Label>
              <Select
                value={form.watch("tipo")}
                onValueChange={(v) => form.setValue("tipo", v as TipoRegra)}
              >
                <SelectTrigger data-testid="regra-select-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PALAVRA_CHAVE">Palavra-chave</SelectItem>
                  <SelectItem value="VALOR_EXATO">Valor exato</SelectItem>
                  <SelectItem value="REGEX">Expressão regular</SelectItem>
                  <SelectItem value="CONTRAPARTE">Contraparte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(tipo === "PALAVRA_CHAVE" || tipo === "REGEX") && (
              <div className="md:col-span-2">
                <Label htmlFor="padrao">
                  {tipo === "REGEX" ? "Expressão regular *" : "Palavra-chave *"}
                </Label>
                <Input
                  id="padrao"
                  {...form.register("padrao")}
                  placeholder={tipo === "REGEX" ? "^PIX.*RECEBIDO" : "PIX RECEBIDO"}
                />
                {form.formState.errors.padrao && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.padrao.message}
                  </p>
                )}
              </div>
            )}

            {tipo === "VALOR_EXATO" && (
              <>
                <div>
                  <Label htmlFor="tolerancia_valor">Tolerância valor (R$)</Label>
                  <Input
                    id="tolerancia_valor"
                    type="number"
                    step="0.01"
                    {...form.register("tolerancia_valor")}
                  />
                </div>
                <div>
                  <Label htmlFor="tolerancia_dias">Tolerância dias</Label>
                  <Input
                    id="tolerancia_dias"
                    type="number"
                    {...form.register("tolerancia_dias")}
                  />
                </div>
              </>
            )}

            {tipo === "CONTRAPARTE" && (
              <div>
                <Label>Tipo contraparte *</Label>
                <Select
                  value={contraparteTipo ?? NONE}
                  onValueChange={(v) =>
                    form.setValue(
                      "contraparte_tipo",
                      v === NONE ? null : (v as ContraparteTipo),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENTE">Cliente</SelectItem>
                    <SelectItem value="FORNECEDOR">Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.contraparte_tipo && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.contraparte_tipo.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Natureza de receita</Label>
              <Select
                value={form.watch("natureza_id") ?? NONE}
                onValueChange={(v) => form.setValue("natureza_id", v === NONE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(naturezas.data ?? []).map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Plano de contas</Label>
              <Select
                value={form.watch("plano_conta_id") ?? NONE}
                onValueChange={(v) =>
                  form.setValue("plano_conta_id", v === NONE ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(planos.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo ? `${p.codigo} — ${p.nome}` : p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Centro de custo</Label>
              <Select
                value={form.watch("centro_custo_id") ?? NONE}
                onValueChange={(v) =>
                  form.setValue("centro_custo_id", v === NONE ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {(centros.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                rows={2}
                {...form.register("observacoes")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : regra ? "Salvar alterações" : "Criar regra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
