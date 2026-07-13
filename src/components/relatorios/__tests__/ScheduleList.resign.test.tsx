// P5.2 — Testes de UI para ScheduleList (badge expirado + botão Regenerar link).
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
    signed_url: "https://old-signed-url.example/file.pdf",
    signed_url_expires_at: new Date(Date.now() - 10_000).toISOString(), // expirado
    delivery_status: "skipped",
    delivery_message_id: null,
    delivery_reason: null,
    error_message: null,
    created_at: new Date().toISOString(),
    resigned_at: null,
    resigned_by: null,
    resign_count: 0,
    ...overrides,
  };
}

const listSchedulesMock = vi.fn();
const listRunsMock = vi.fn();
const resignRunMock = vi.fn();

vi.mock("@/services/reportSchedulesService", () => ({
  reportSchedulesService: {
    listSchedules: (...a: unknown[]) => listSchedulesMock(...a),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    toggleSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    listRuns: (...a: unknown[]) => listRunsMock(...a),
    resignRun: (...a: unknown[]) => resignRunMock(...a),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("ScheduleList — P5.2 resign UI", () => {
  beforeEach(() => {
    listSchedulesMock.mockReset().mockResolvedValue([makeSchedule("sch-1")]);
    listRunsMock.mockReset();
    resignRunMock.mockReset();
  });
  afterEach(() => cleanup());

  it("renderiza badge 'Link expirado' quando signed_url_expires_at está no passado", async () => {
    listRunsMock.mockResolvedValue([makeRun()]);
    render(
      <ScheduleList
        open
        onOpenChange={() => {}}
        scope="vendas"
        viewState={{ schema_version: 1, scope: "vendas", filters: {} }}
      />,
    );
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Agendamento sch-1")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Ver execuções/i }));
    await waitFor(() => expect(screen.getByTestId("expired-badge-run-1")).toBeInTheDocument());
    expect(screen.getByTestId("resign-button-run-1")).toBeInTheDocument();
    // Botão "Baixar" NÃO aparece quando o link está expirado.
    expect(screen.queryByRole("link", { name: /Baixar/i })).toBeNull();
  });

  it("clicar em 'Regenerar link' chama resignRun e atualiza o link no sucesso", async () => {
    listRunsMock.mockResolvedValue([makeRun()]);
    const newExpires = new Date(Date.now() + 60_000).toISOString();
    resignRunMock.mockResolvedValue({
      run_id: "run-1",
      signed_url: "https://new-signed-url.example/file.pdf",
      signed_url_expires_at: newExpires,
      resign_count: 1,
      resigned_at: new Date().toISOString(),
    });
    render(
      <ScheduleList
        open
        onOpenChange={() => {}}
        scope="vendas"
        viewState={{ schema_version: 1, scope: "vendas", filters: {} }}
      />,
    );
    const user = userEvent.setup();
    await waitFor(() => screen.getByText("Agendamento sch-1"));
    await user.click(screen.getByRole("button", { name: /Ver execuções/i }));
    const btn = await screen.findByTestId("resign-button-run-1");
    await user.click(btn);
    await waitFor(() => expect(resignRunMock).toHaveBeenCalledWith("run-1"));
    // Após sucesso, novo link "Baixar" fica disponível e badge some.
    await waitFor(() => {
      expect(screen.queryByTestId("expired-badge-run-1")).toBeNull();
      expect(screen.getByRole("link", { name: /Baixar/i })).toHaveAttribute(
        "href",
        "https://new-signed-url.example/file.pdf",
      );
    });
  });

  it("exibe mensagem sanitizada em caso de erro (não vaza detalhes internos)", async () => {
    const { toast } = await import("sonner");
    listRunsMock.mockResolvedValue([makeRun()]);
    resignRunMock.mockRejectedValue(new Error("Limite diário de regenerações atingido para esta execução."));
    render(
      <ScheduleList
        open
        onOpenChange={() => {}}
        scope="vendas"
        viewState={{ schema_version: 1, scope: "vendas", filters: {} }}
      />,
    );
    const user = userEvent.setup();
    await waitFor(() => screen.getByText("Agendamento sch-1"));
    await user.click(screen.getByRole("button", { name: /Ver execuções/i }));
    const btn = await screen.findByTestId("resign-button-run-1");
    await user.click(btn);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Limite diário de regenerações atingido para esta execução.",
      ),
    );
    // Badge continua exibido (link não foi renovado).
    expect(screen.getByTestId("expired-badge-run-1")).toBeInTheDocument();
  });
});
