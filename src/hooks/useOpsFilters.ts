// P6.4 — Filtros persistentes (per-user) para a página de Operações de Relatórios.
// Persistência em localStorage com chave versionada; fallback silencioso para defaults.
import { useCallback, useEffect, useState } from "react";

export type OpsWindow = "24h" | "7d" | "30d";
export type OpsAlertStatusFilter = "open" | "resolved" | "all";

export interface OpsFiltersState {
  reason: string | null;
  alertStatus: OpsAlertStatusFilter;
  window: OpsWindow;
}

export const OPS_FILTERS_DEFAULT: OpsFiltersState = {
  reason: null,
  alertStatus: "all",
  window: "24h",
};

const STORAGE_VERSION = "v1";

function storageKey(userId: string | null | undefined): string {
  const uid = userId && userId.length > 0 ? userId : "anon";
  return `relatorios-ops:filters:${STORAGE_VERSION}:${uid}`;
}

function isValid(x: unknown): x is OpsFiltersState {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const validAlert = o.alertStatus === "open" || o.alertStatus === "resolved" || o.alertStatus === "all";
  const validWindow = o.window === "24h" || o.window === "7d" || o.window === "30d";
  const validReason = o.reason === null || typeof o.reason === "string";
  return validAlert && validWindow && validReason;
}

function readFromStorage(key: string): OpsFiltersState {
  try {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (!raw) return OPS_FILTERS_DEFAULT;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : OPS_FILTERS_DEFAULT;
  } catch {
    return OPS_FILTERS_DEFAULT;
  }
}

export function windowToHours(w: OpsWindow): number {
  if (w === "7d") return 24 * 7;
  if (w === "30d") return 24 * 30;
  return 24;
}

export function useOpsFilters(userId: string | null | undefined) {
  const key = storageKey(userId);
  const [state, setState] = useState<OpsFiltersState>(() => readFromStorage(key));

  // Recarrega quando muda o usuário (ou entra em contexto após login).
  useEffect(() => {
    setState(readFromStorage(key));
  }, [key]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch {
      /* quota/private mode → silent */
    }
  }, [key, state]);

  const patch = useCallback((p: Partial<OpsFiltersState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  const reset = useCallback(() => setState(OPS_FILTERS_DEFAULT), []);

  return { filters: state, patch, reset };
}
