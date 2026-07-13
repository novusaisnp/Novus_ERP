// P7.2 — Testes de UI para estado "prunado" no ScheduleList.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleList } from "@/components/relatorios/ScheduleList";
import type { ReportSchedule, ReportScheduleRun } from "@/types/reportSchedule";

const OWNER_ID = "00000000-0000-0000-0000-000000000001";

function makeSchedule(id: string): ReportSchedule {
  return {
    id,
    user_id: OWNER_ID,
    name: `Agendamento ${id}`,
    scope: "vendas",
    format: "pdf",
    frequency: "daily",
    hour_utc: 9,
    day_of_week: null,
    day_of_month: null,
    next_run_at: new Date(Date.now() + 3600_000).toISOString(),
    last_run_at: null,
    recipients: [],
    view_state: { schema_version: 1, scope: "vendas", filters: {} },
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeRun(overrides: Partial<ReportScheduleRun> = {}): ReportScheduleRun {
  return {
    id: "run-1",
    schedule_id: "sch-1",
    user_id: OWNER_ID,
    idempotency_key: "k",
    attempt: 1,
    status: "succeeded",
    started_at: new Date(Date.now() - 3600_000).toISOString(),
    finished_at: new Date(Date.now() - 3500_000).toISOString(),
    artifact_path: "user/sch-1/run-1.pdf",
    signed_url: "https://signed.example/file.pdf",
    signed_url_expires_at: new Date(Date.now() + 60_000).toISOString(),
    delivery_status: null,
    delivery_message_id: null,
    delivery_reason: null,
    error_message: null,
    created_at: new Date().toISOString(),
    resigned_at: null,
    resigned_by: null,
    resign_count: 0,
    artifact_pruned_at: null,
    artifact_prune_reason: null,
    ...overrides,
  };
}

const listSchedulesMock = vi.fn();
const listRunsMock = vi.fn();

vi.mock("@/services/reportSchedulesService", () => ({
  reportSchedulesService: {
    listSchedules: (...a: unknown[]) => listSchedulesMock(...a),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    toggleSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    listRuns: (...a: unknown[]) => listRunsMock(...a),
    resignRun: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

async function openRuns() {
  const user = userEvent.setup();
  await waitFor(() => expect(screen.getByText("Agendamento sch-1")).toBeInTheDocument());
  await user.click(screen.getByRole("button", { name: /Ver execuções/i }));
}

describe("ScheduleList — P7.2 retenção", () => {
  beforeEach(() => {
    listSchedulesMock.mockReset().mockResolvedValue([makeSchedule("sch-1")]);
    listRunsMock.mockReset();
  });
  afterEach(() => cleanup());

  it("run prunado exibe badge 'Arquivo removido por retenção'", async () => {
    listRunsMock.mockResolvedValue([
      makeRun({
        artifact_path: null,
        signed_url: null,
        signed_url_expires_at: null,
        artifact_pruned_at: new Date(Date.now() - 86400_000).toISOString(),
        artifact_prune_reason: "retention_expired",
      }),
    ]);
    render(<ScheduleList open onOpenChange={() => {}} scope="vendas" viewState={{ schema_version: 1, scope: "vendas", filters: {} }} />);
    await openRuns();
    await waitFor(() => expect(screen.getByTestId("pruned-badge-run-1")).toBeInTheDocument());
  });

  it("run prunado não mostra ação de download nem regenerar", async () => {
    listRunsMock.mockResolvedValue([
      makeRun({
        artifact_pruned_at: new Date().toISOString(),
        artifact_prune_reason: "retention_expired",
        // legado inconsistente: mesmo com signed_url presente, não deve oferecer download.
        signed_url: "https://legacy.example/file.pdf",
        signed_url_expires_at: new Date(Date.now() + 3600_000).toISOString(),
      }),
    ]);
    render(<ScheduleList open onOpenChange={() => {}} scope="vendas" viewState={{ schema_version: 1, scope: "vendas", filters: {} }} />);
    await openRuns();
    await waitFor(() => expect(screen.getByTestId("pruned-badge-run-1")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /Baixar/i })).toBeNull();
    expect(screen.queryByTestId("resign-button-run-1")).toBeNull();
  });

  it("run não prunado com link ativo mantém botão Baixar", async () => {
    listRunsMock.mockResolvedValue([makeRun()]);
    render(<ScheduleList open onOpenChange={() => {}} scope="vendas" viewState={{ schema_version: 1, scope: "vendas", filters: {} }} />);
    await openRuns();
    await waitFor(() => expect(screen.getByRole("link", { name: /Baixar/i })).toBeInTheDocument());
    expect(screen.queryByTestId("pruned-badge-run-1")).toBeNull();
    expect(screen.queryByTestId("expired-badge-run-1")).toBeNull();
  });

  it("precedência prunado > expirado: exibe apenas badge de retenção", async () => {
    listRunsMock.mockResolvedValue([
      makeRun({
        signed_url_expires_at: new Date(Date.now() - 10_000).toISOString(), // expirado
        artifact_pruned_at: new Date().toISOString(),
        artifact_prune_reason: "retention_expired",
      }),
    ]);
    render(<ScheduleList open onOpenChange={() => {}} scope="vendas" viewState={{ schema_version: 1, scope: "vendas", filters: {} }} />);
    await openRuns();
    await waitFor(() => expect(screen.getByTestId("pruned-badge-run-1")).toBeInTheDocument());
    expect(screen.queryByTestId("expired-badge-run-1")).toBeNull();
    expect(screen.queryByTestId("resign-button-run-1")).toBeNull();
  });
});
