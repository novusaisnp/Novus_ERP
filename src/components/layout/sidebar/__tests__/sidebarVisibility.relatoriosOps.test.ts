// P6.1 — testes de visibilidade do item admin "Relatórios (Ops)" no sidebar.
import { describe, expect, it } from "vitest";
import { getVisibleSidebarItems } from "../sidebarVisibility";

const findConfig = (items: ReturnType<typeof getVisibleSidebarItems>) =>
  items.find((g) => g.title === "Configurações");

describe("sidebarVisibility — Relatórios (Ops)", () => {
  it("expõe o módulo Fiscal e restringe só o dashboard ao admin", () => {
    const comum = getVisibleSidebarItems({ isAdmin: false }).find((grupo) => grupo.title === 'Fiscal');
    expect(comum?.items?.map((item) => item.url)).toEqual([
      '/fiscal/notas-fiscais', '/fiscal/mdfe', '/fiscal/sped', '/fiscal/tributos',
    ]);
    const admin = getVisibleSidebarItems({ isAdmin: true }).find((grupo) => grupo.title === 'Fiscal');
    expect(admin?.items?.map((item) => item.url)).toContain('/fiscal/dashboard');
  });

  it("expõe o item para admin", () => {
    const groups = getVisibleSidebarItems({ isAdmin: true });
    const config = findConfig(groups);
    expect(config).toBeDefined();
    const urls = config?.items?.map((s) => s.url) ?? [];
    expect(urls).toContain("/configuracoes/relatorios-ops");
  });

  it("oculta o item para não-admin", () => {
    const groups = getVisibleSidebarItems({ isAdmin: false });
    const config = findConfig(groups);
    expect(config).toBeDefined();
    const urls = config?.items?.map((s) => s.url) ?? [];
    expect(urls).not.toContain("/configuracoes/relatorios-ops");
  });

  it("mantém itens padrão de Configurações para não-admin (Empresas/Usuários/Webhooks)", () => {
    const groups = getVisibleSidebarItems({ isAdmin: false });
    const urls = findConfig(groups)?.items?.map((s) => s.url) ?? [];
    expect(urls).toContain("/configuracoes/empresas");
    expect(urls).toContain("/configuracoes/usuarios");
    expect(urls).toContain("/configuracoes/webhooks");
  });
});
