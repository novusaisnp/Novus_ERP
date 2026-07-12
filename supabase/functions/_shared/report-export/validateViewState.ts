import { z } from "npm:zod@3.23.8";

// Schema versionado do "view state" persistido no schedule.
// v1: filtros básicos + agrupamento + ordenação. Qualquer campo desconhecido é rejeitado.
export const ViewStateV1Schema = z
  .object({
    schema_version: z.literal(1),
    scope: z.enum(["vendas", "financeiro"]),
    filters: z
      .object({
        date_from: z.string().datetime().optional(),
        date_to: z.string().datetime().optional(),
        status: z.array(z.string().max(64)).max(20).optional(),
        empresa_representada_id: z.string().uuid().optional(),
        search: z.string().max(200).optional(),
      })
      .strict()
      .default({}),
    group_by: z.array(z.string().max(64)).max(4).optional(),
    sort: z
      .array(
        z.object({
          field: z.string().max(64),
          dir: z.enum(["asc", "desc"]),
        }),
      )
      .max(4)
      .optional(),
    columns: z.array(z.string().max(64)).max(64).optional(),
  })
  .strict();

export type ViewStateV1 = z.infer<typeof ViewStateV1Schema>;

export interface ValidateResult {
  ok: boolean;
  data: ViewStateV1 | null;
  error: string | null;
}

export function validateViewState(input: unknown): ValidateResult {
  if (input === null || typeof input !== "object") {
    return { ok: false, data: null, error: "view_state_not_object" };
  }
  const anyInput = input as Record<string, unknown>;
  if (anyInput.schema_version !== 1) {
    return { ok: false, data: null, error: "unsupported_schema_version" };
  }
  const parsed = ViewStateV1Schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, data: null, error: parsed.error.issues.map((i) => i.path.join(".") + ":" + i.code).join("|") };
  }
  return { ok: true, data: parsed.data, error: null };
}

// Cálculo determinístico do próximo next_run_at a partir do schedule.
// Frequencies: daily | weekly | monthly. Timezone: UTC (as horas são armazenadas em UTC).
export interface NextRunInput {
  frequency: "daily" | "weekly" | "monthly";
  hour: number; // 0-23
  minute: number; // 0-59
  day_of_week: number | null; // 0-6 (weekly)
  day_of_month: number | null; // 1-28 (monthly)
  reference: Date;
}

export function computeNextRunAt(input: NextRunInput): Date {
  const { frequency, hour, minute, day_of_week, day_of_month, reference } = input;
  const ref = new Date(reference.getTime());

  if (frequency === "daily") {
    const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), hour, minute, 0, 0));
    if (next.getTime() <= ref.getTime()) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (frequency === "weekly") {
    const targetDow = day_of_week ?? 1;
    const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), hour, minute, 0, 0));
    let diff = (targetDow - next.getUTCDay() + 7) % 7;
    if (diff === 0 && next.getTime() <= ref.getTime()) diff = 7;
    next.setUTCDate(next.getUTCDate() + diff);
    return next;
  }

  // monthly
  const targetDom = Math.min(Math.max(day_of_month ?? 1, 1), 28);
  const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), targetDom, hour, minute, 0, 0));
  if (next.getTime() <= ref.getTime()) next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

// idempotency_key estável — combina schedule + slot de execução planejado.
export function buildIdempotencyKey(scheduleId: string, plannedRunAt: Date): string {
  return `${scheduleId}:${plannedRunAt.toISOString()}`;
}

// Backoff por tentativa — 5m, 15m, 60m.
export function backoffDelayMs(attempt: number): number {
  if (attempt <= 1) return 5 * 60 * 1000;
  if (attempt === 2) return 15 * 60 * 1000;
  return 60 * 60 * 1000;
}
