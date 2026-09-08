import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { PermissionGate } from "../PermissionGate";

const renderGate = (props: Partial<React.ComponentProps<typeof PermissionGate>> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PermissionGate codigo="fiscal.create" fallback={<div>SEM_PERMISSAO</div>} {...props}>
        <div>BOTAO_PROTEGIDO</div>
      </PermissionGate>
    </QueryClientProvider>,
  );
};

describe("PermissionGate", () => {
  beforeEach(() => rpcMock.mockReset());

  it("não renderiza os filhos enquanto carrega", async () => {
    let resolve!: (v: { data: boolean; error: null }) => void;
    rpcMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderGate();
    expect(screen.queryByText("BOTAO_PROTEGIDO")).not.toBeInTheDocument();
    resolve({ data: true, error: null });
    await waitFor(() => expect(screen.getByText("BOTAO_PROTEGIDO")).toBeInTheDocument());
  });

  it("renderiza os filhos quando permitido", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    renderGate();
    await waitFor(() => expect(screen.getByText("BOTAO_PROTEGIDO")).toBeInTheDocument());
  });

  it("renderiza o fallback quando negado", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    renderGate();
    await waitFor(() => expect(screen.getByText("SEM_PERMISSAO")).toBeInTheDocument());
    expect(screen.queryByText("BOTAO_PROTEGIDO")).not.toBeInTheDocument();
  });

  it("sem fallback não renderiza nada quando negado", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PermissionGate codigo="fiscal.create">
          <div>BOTAO_PROTEGIDO</div>
        </PermissionGate>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    expect(screen.queryByText("BOTAO_PROTEGIDO")).not.toBeInTheDocument();
  });
});
