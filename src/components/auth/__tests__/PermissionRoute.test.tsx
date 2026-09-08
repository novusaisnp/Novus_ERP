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

import { PermissionRoute } from "../PermissionRoute";

const renderAt = (initialPath: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/fiscal/notas-fiscais"
            element={
              <PermissionRoute codigo="fiscal.read">
                <div>FISCAL_CONTENT</div>
              </PermissionRoute>
            }
          />
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/login" element={<div>LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("PermissionRoute", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    authMock.mockReset();
  });

  it("sem a permissão é redirecionado para /", async () => {
    authMock.mockReturnValue({ user: { id: "user-1" } });
    rpcMock.mockResolvedValue({ data: false, error: null });
    renderAt("/fiscal/notas-fiscais");
    await waitFor(() => expect(screen.getByText("HOME")).toBeInTheDocument());
    expect(screen.queryByText("FISCAL_CONTENT")).not.toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledWith("pode", { p_permissao: "fiscal.read" });
  });

  it("com a permissão acessa o conteúdo", async () => {
    authMock.mockReturnValue({ user: { id: "user-1" } });
    rpcMock.mockResolvedValue({ data: true, error: null });
    renderAt("/fiscal/notas-fiscais");
    await waitFor(() => expect(screen.getByText("FISCAL_CONTENT")).toBeInTheDocument());
  });

  it("erro na consulta nega por padrão", async () => {
    authMock.mockReturnValue({ user: { id: "user-1" } });
    rpcMock.mockResolvedValue({ data: null, error: new Error("boom") });
    renderAt("/fiscal/notas-fiscais");
    await waitFor(() => expect(screen.getByText("HOME")).toBeInTheDocument());
  });

  it("sem sessão redireciona para /login", async () => {
    authMock.mockReturnValue({ user: null });
    renderAt("/fiscal/notas-fiscais");
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeInTheDocument());
  });
});
