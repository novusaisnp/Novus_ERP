import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MAX_ROWS_CSV,
  MAX_ROWS_PDF,
  MAX_ROWS_XLSX,
  PAGE_SIZE,
  RUN_TIMEOUT_MS,
  maxRowsForFormat,
} from "../_shared/report-export/limits.ts";
import { classifyReason, isDefinitive } from "../_shared/report-export/errorCodes.ts";

Deno.test("limits — caps por formato", () => {
  assertEquals(maxRowsForFormat("csv"), MAX_ROWS_CSV);
  assertEquals(maxRowsForFormat("xlsx"), MAX_ROWS_XLSX);
  assertEquals(maxRowsForFormat("pdf"), MAX_ROWS_PDF);
  assertEquals(MAX_ROWS_CSV, 100_000);
  assertEquals(MAX_ROWS_XLSX, 50_000);
  assertEquals(MAX_ROWS_PDF, 5_000);
  assertEquals(PAGE_SIZE, 5_000);
  assertEquals(RUN_TIMEOUT_MS, 90_000);
});

Deno.test("classifyReason — reason canônico + detail", () => {
  const r1 = classifyReason("row_limit_exceeded:vendas:100000");
  assertEquals(r1.reason, "row_limit_exceeded");
  assertEquals(r1.detail, "vendas:100000");

  const r2 = classifyReason("run_timeout:budget_exceeded");
  assertEquals(r2.reason, "run_timeout");

  const r3 = classifyReason("weird_error:nope");
  assertEquals(r3.reason, "unknown");
  assertEquals(r3.detail, "nope");

  const r4 = classifyReason("no_colon_here");
  assertEquals(r4.reason, "unknown");
  assertEquals(r4.detail, "no_colon_here");
});

Deno.test("isDefinitive — row_limit_exceeded e invalid_view_state não retentam", () => {
  assert(isDefinitive("row_limit_exceeded"));
  assert(isDefinitive("invalid_view_state"));
  assertEquals(isDefinitive("run_timeout"), false);
  assertEquals(isDefinitive("scope_query_failed"), false);
  assertEquals(isDefinitive("unknown"), false);
});

Deno.test("paginação — simulação de acumulação com cap e stop", () => {
  // Simula o loop de paginação: total 12k linhas, cap 5k -> deve estourar.
  const cap = 5_000;
  const totalRows = 12_000;
  const pageSize = 5_000;
  const rows: number[] = [];
  const seen = new Set<number>();
  let overflow = false;
  let from = 0;

  while (rows.length <= cap) {
    const page: number[] = [];
    for (let i = from; i < Math.min(from + pageSize, totalRows); i++) page.push(i);
    if (page.length === 0) break;

    for (const id of page) {
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(id);
      if (rows.length > cap) {
        overflow = true;
        break;
      }
    }
    if (overflow) break;
    if (page.length < pageSize) break;
    from += pageSize;
  }

  assert(overflow);
  // Não deve haver duplicatas.
  assertEquals(seen.size, rows.length);
});

Deno.test("paginação — dataset abaixo do cap acumula sem duplicar", () => {
  const cap = 50_000;
  const totalRows = 12_345;
  const pageSize = 5_000;
  const rows: number[] = [];
  const seen = new Set<number>();
  let from = 0;

  while (rows.length <= cap) {
    const page: number[] = [];
    for (let i = from; i < Math.min(from + pageSize, totalRows); i++) page.push(i);
    if (page.length === 0) break;
    for (const id of page) {
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(id);
    }
    if (page.length < pageSize) break;
    from += pageSize;
  }
  assertEquals(rows.length, totalRows);
  assertEquals(seen.size, totalRows);
});
