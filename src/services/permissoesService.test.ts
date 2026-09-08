import { describe, expect, it, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { fetchPode, fetchPermissoes } from "./permissoesService";

describe("permissoesService", () => {
  beforeEach(() => rpcMock.mockReset());

  describe("fetchPode", () => {
    it("retorna true quando a RPC confirma", async () => {
      rpcMock.mockResolvedValue({ data: true, error: null });
      await expect(fetchPode("fiscal.create")).resolves.toBe(true);
      expect(rpcMock).toHaveBeenCalledWith("pode", { p_permissao: "fiscal.create" });
    });

    it("retorna false quando a RPC nega", async () => {
      rpcMock.mockResolvedValue({ data: false, error: null });
      await expect(fetchPode("fiscal.create")).resolves.toBe(false);
    });

    it("propaga erro da RPC", async () => {
      rpcMock.mockResolvedValue({ data: null, error: new Error("boom") });
      await expect(fetchPode("fiscal.create")).rejects.toThrow("boom");
    });
  });

  describe("fetchPermissoes", () => {
    it("retorna objeto vazio sem chamar a RPC quando não há códigos", async () => {
      await expect(fetchPermissoes([])).resolves.toEqual({});
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("retorna o mapa de permissões da RPC em lote", async () => {
      rpcMock.mockResolvedValue({
        data: { "fiscal.create": true, "fiscal.cancelarNfe": false },
        error: null,
      });
      await expect(fetchPermissoes(["fiscal.create", "fiscal.cancelarNfe"])).resolves.toEqual({
        "fiscal.create": true,
        "fiscal.cancelarNfe": false,
      });
      expect(rpcMock).toHaveBeenCalledWith("permissoes_usuario", {
        p_codigos: ["fiscal.create", "fiscal.cancelarNfe"],
      });
    });

    it("propaga erro da RPC em lote", async () => {
      rpcMock.mockResolvedValue({ data: null, error: new Error("boom") });
      await expect(fetchPermissoes(["fiscal.create"])).rejects.toThrow("boom");
    });
  });
});
