// P6.2 — Testes de UI: AlertsDrawer (badge + ack).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertsDrawer } from "@/components/relatorios/ops/AlertsDrawer";
import type { OpsAlertRow } from "@/services/opsAlertsService";

const listOpsAlertsMock = vi.fn();
const countOpenOpsAlertsMock = vi.fn();
const ackOpsAlertMock = vi.fn();

vi.mock("@/services/opsAlertsService", () => ({
  listOpsAlerts: (...a: unknown[]) => listOpsAlertsMock(...a),
  countOpenOpsAlerts: (...a: unknown[]) => countOpenOpsAlertsMock(...a),
  ackOpsAlert: (...a: unknown[]) => ackOpsAlertMock(...a),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

function alert(overrides: Partial<OpsAlertRow> = {}): OpsAlertRow {
  return {
    id: "a1",
    kind: "cron_heartbeat",
    severity: "page",
    reason: "heartbeat_stale",
    payload: {},
    acknowledged_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderDrawer() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AlertsDrawer />
    </QueryClientProvider>,
  );
}

describe("AlertsDrawer (P6.2)", () => {
  beforeEach(() => {
    listOpsAlertsMock.mockReset();
    countOpenOpsAlertsMock.mockReset();
    ackOpsAlertMock.mockReset();
  });
  afterEach(() => cleanup());

  it("exibe badge com contagem de alertas abertos", async () => {
    countOpenOpsAlertsMock.mockResolvedValue(3);
    listOpsAlertsMock.mockResolvedValue([]);
    renderDrawer();
    const badge = await screen.findByTestId("alerts-badge");
    expect(badge.textContent).toBe("3");
  });

  it("não renderiza badge quando 0 abertos", async () => {
    countOpenOpsAlertsMock.mockResolvedValue(0);
    listOpsAlertsMock.mockResolvedValue([]);
    renderDrawer();
    await waitFor(() => {
      expect(screen.queryByTestId("alerts-badge")).toBeNull();
    });
  });

  it("renderiza lista de alertas abertos e chama ack ao clicar em Reconhecer", async () => {
    const user = userEvent.setup();
    countOpenOpsAlertsMock.mockResolvedValue(1);
    listOpsAlertsMock.mockResolvedValue([alert()]);
    ackOpsAlertMock.mockResolvedValue(undefined);

    renderDrawer();
    await user.click(screen.getByRole("button", { name: /abrir alertas/i }));

    await waitFor(() => {
      expect(screen.getByTestId("alerts-open-list")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Reconhecer" }));

    await waitFor(() => {
      expect(ackOpsAlertMock).toHaveBeenCalledWith("a1");
    });
  });
});
