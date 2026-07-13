// P6.1 — teste do gate AdminRoute em acesso direto por URL.
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

const authMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock(),
}));

import { AdminRoute } from "../AdminRoute";

const renderAt = (initialPath: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/configuracoes/relatorios-ops"
            element={
              <AdminRoute>
                <div>ADMIN_CONTENT</div>
              </AdminRoute>
            }
          />
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AdminRoute — acesso direto a /configuracoes/relatorios-ops", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    authMock.mockReset();
  });

  it("não-admin é redirecionado para /", async () => {
    authMock.mockReturnValue({ user: { id: "user-1" } });
    rpcMock.mockResolvedValue({ data: false, error: null });
    renderAt("/configuracoes/relatorios-ops");
    await waitFor(() => expect(screen.getByText("HOME")).toBeInTheDocument());
    expect(screen.queryByText("ADMIN_CONTENT")).not.toBeInTheDocument();
  });

  it("admin acessa o conteúdo", async () => {
    authMock.mockReturnValue({ user: { id: "admin-1" } });
    rpcMock.mockResolvedValue({ data: true, error: null });
    renderAt("/configuracoes/relatorios-ops");
    await waitFor(() => expect(screen.getByText("ADMIN_CONTENT")).toBeInTheDocument());
  });

  it("sem sessão redireciona para /login", async () => {
    authMock.mockReturnValue({ user: null });
    renderAt("/configuracoes/relatorios-ops");
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeInTheDocument());
  });
});
