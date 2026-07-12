import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getTemplate, TEMPLATES } from "../_shared/transactional-email-templates/registry.ts";
import { EmailProvider } from "../_shared/delivery/EmailProvider.ts";
import { NoopProvider } from "../_shared/delivery/NoopProvider.ts";
import { resolveDeliveryProvider } from "../_shared/delivery/resolveProvider.ts";
import {
  _resetBrandingCacheForTests,
  fetchLogoBytes,
  type Branding,
} from "../_shared/report-export/branding.ts";
import { exportPdfServer } from "../_shared/report-export/exportPdfServer.ts";
import { exportXlsxServer } from "../_shared/report-export/exportXlsxServer.ts";

// Bytes PNG mínimos válidos (1x1 transparent).
const PNG_1x1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

const brandingWithLogo: Branding = {
  companyName: "Empresa Teste",
  primaryColor: "#1e293b",
  logo: { bytes: PNG_1x1, contentType: "image/png", extension: "PNG" },
};

// -------- Email dormante --------

Deno.test("registry — contém report-scheduled-delivery", () => {
  assert(getTemplate("report-scheduled-delivery"));
  assert(Object.keys(TEMPLATES).includes("report-scheduled-delivery"));
});

Deno.test("EmailProvider — sem domínio retorna failed controlado", async () => {
  const p = new EmailProvider({ senderDomain: null, fromDomain: null });
  const r = await p.send({
    runId: "r", scheduleId: "s", userId: "u", scope: "vendas",
    format: "csv", signedUrl: "https://x", recipients: ["a@b.com"],
    scheduleName: "n", generatedAt: new Date().toISOString(),
  });
  assertEquals(r.status, "failed");
  assertEquals(r.reason, "email_domain_not_configured");
});

Deno.test("EmailProvider — sem recipients retorna failed", async () => {
  const p = new EmailProvider({ senderDomain: "notify.x.com", fromDomain: "x.com" });
  const r = await p.send({
    runId: "r", scheduleId: "s", userId: "u", scope: "vendas",
    format: "csv", signedUrl: "https://x", recipients: [],
    scheduleName: "n", generatedAt: new Date().toISOString(),
  });
  assertEquals(r.status, "failed");
  assertEquals(r.reason, "no_recipients");
});

Deno.test("EmailProvider — mesmo com domínio permanece dormente (não ativado)", async () => {
  const p = new EmailProvider({ senderDomain: "notify.x.com", fromDomain: "x.com" });
  const r = await p.send({
    runId: "r", scheduleId: "s", userId: "u", scope: "vendas",
    format: "csv", signedUrl: "https://x", recipients: ["a@b.com"],
    scheduleName: "n", generatedAt: new Date().toISOString(),
  });
  assertEquals(r.status, "failed");
  assertEquals(r.reason, "email_provider_not_activated");
});

Deno.test("resolveDeliveryProvider — default noop", () => {
  const p = resolveDeliveryProvider({});
  assert(p instanceof NoopProvider);
  assertEquals(p.name, "noop");
});

Deno.test("resolveDeliveryProvider — email sem domínio ainda cai em noop", () => {
  const p = resolveDeliveryProvider({ DELIVERY_PROVIDER: "email" });
  assert(p instanceof NoopProvider);
});

Deno.test("resolveDeliveryProvider — email + domínio retorna EmailProvider", () => {
  const p = resolveDeliveryProvider({
    DELIVERY_PROVIDER: "email",
    SENDER_DOMAIN: "notify.x.com",
    FROM_DOMAIN: "x.com",
  });
  assertEquals(p.name, "email");
});

// -------- Branding fetch --------

Deno.test("fetchLogoBytes — URL inválida retorna null", async () => {
  _resetBrandingCacheForTests();
  const r = await fetchLogoBytes("not-a-url");
  assertEquals(r, null);
});

Deno.test("fetchLogoBytes — timeout curto não lança", async () => {
  _resetBrandingCacheForTests();
  // Endpoint que atrasa (10s) — timeout 50ms garante abort.
  const r = await fetchLogoBytes("https://httpbin.org/delay/10", 50);
  assertEquals(r, null);
});

// -------- Branding em exports --------

Deno.test("exportXlsxServer — com branding gera bytes válidos", async () => {
  const bytes = await exportXlsxServer({
    sheetName: "Resumo",
    columns: ["a", "b"],
    rows: [{ a: 1, b: 2 }],
    branding: brandingWithLogo,
  });
  assert(bytes.byteLength > 0);
  // XLSX é ZIP — magic PK\x03\x04
  assertEquals(bytes[0], 0x50);
  assertEquals(bytes[1], 0x4b);
});

Deno.test("exportXlsxServer — sem branding não quebra", async () => {
  const bytes = await exportXlsxServer({
    sheetName: "Resumo",
    columns: ["a"],
    rows: [{ a: 1 }],
    branding: null,
  });
  assert(bytes.byteLength > 0);
});

Deno.test("exportPdfServer — com branding gera PDF válido", async () => {
  const bytes = await exportPdfServer({
    title: "Relatório",
    columns: ["a", "b"],
    rows: [{ a: "x", b: "y" }],
    branding: brandingWithLogo,
  });
  // PDF magic: %PDF
  assertEquals(bytes[0], 0x25);
  assertEquals(bytes[1], 0x50);
  assertEquals(bytes[2], 0x44);
  assertEquals(bytes[3], 0x46);
});

Deno.test("exportPdfServer — sem branding continua funcional", async () => {
  const bytes = await exportPdfServer({
    title: "Relatório",
    columns: ["a"],
    rows: [{ a: "x" }],
    branding: null,
  });
  assertEquals(bytes[0], 0x25);
});

Deno.test("exportPdfServer — branding com logo inválida (bytes vazios) não derruba", async () => {
  const badBranding: Branding = {
    companyName: "X",
    primaryColor: "invalid-color",
    logo: { bytes: new Uint8Array([0, 0, 0]), contentType: "image/png", extension: "PNG" },
  };
  const bytes = await exportPdfServer({
    title: "R",
    columns: ["a"],
    rows: [{ a: 1 }],
    branding: badBranding,
  });
  assertEquals(bytes[0], 0x25);
});
