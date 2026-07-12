import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Presets de visão de relatórios persistidos em localStorage.
 * Escopo: 'vendas' | 'financeiro'. Sem backend.
 */

const SCHEMA_VERSION = 1 as const;
const MAX_PRESETS = 20;

export type ReportScope = 'vendas' | 'financeiro';

export interface ReportPreset<S> {
  id: string;
  name: string;
  scope: ReportScope;
  state: S;
  isDefault?: boolean;
  createdAt: string;
}

interface StorageShape<S> {
  schemaVersion: typeof SCHEMA_VERSION;
  presets: ReportPreset<S>[];
}

const storageKey = (scope: ReportScope) => `novus.reports.presets.${scope}`;

function makeId(): string {
  // uuid v4 leve; sem depender de crypto.randomUUID em ambientes antigos
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStore<S>(scope: ReportScope): StorageShape<S> {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return { schemaVersion: SCHEMA_VERSION, presets: [] };
    const parsed = JSON.parse(raw) as Partial<StorageShape<S>>;
    if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.presets)) {
      return { schemaVersion: SCHEMA_VERSION, presets: [] };
    }
    return { schemaVersion: SCHEMA_VERSION, presets: parsed.presets };
  } catch {
    return { schemaVersion: SCHEMA_VERSION, presets: [] };
  }
}

function writeStore<S>(scope: ReportScope, store: StorageShape<S>): boolean {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(store));
    return true;
  } catch (err) {
    console.error('[useReportPresets] falha ao salvar', err);
    toast.error('Não foi possível salvar o preset (armazenamento local cheio ou indisponível).');
    return false;
  }
}

export interface UseReportPresetsApi<S> {
  presets: ReportPreset<S>[];
  save: (name: string, state: S) => ReportPreset<S> | null;
  apply: (id: string) => S | null;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  setDefault: (id: string | null) => void;
  getDefault: () => ReportPreset<S> | null;
}

export function useReportPresets<S>(scope: ReportScope): UseReportPresetsApi<S> {
  const [presets, setPresets] = useState<ReportPreset<S>[]>(() => readStore<S>(scope).presets);

  // Sincroniza quando o scope muda
  useEffect(() => {
    setPresets(readStore<S>(scope).presets);
  }, [scope]);

  const persist = useCallback(
    (next: ReportPreset<S>[]) => {
      const ok = writeStore<S>(scope, { schemaVersion: SCHEMA_VERSION, presets: next });
      if (ok) setPresets(next);
      return ok;
    },
    [scope],
  );

  const save = useCallback(
    (name: string, state: S): ReportPreset<S> | null => {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error('Informe um nome para o preset.');
        return null;
      }
      const current = readStore<S>(scope).presets;
      if (current.length >= MAX_PRESETS) {
        toast.error(`Limite de ${MAX_PRESETS} presets atingido para esta tela.`);
        return null;
      }
      const preset: ReportPreset<S> = {
        id: makeId(),
        name: trimmed,
        scope,
        state,
        createdAt: new Date().toISOString(),
      };
      const next = [...current, preset];
      if (!persist(next)) return null;
      toast.success(`Preset "${trimmed}" salvo.`);
      return preset;
    },
    [scope, persist],
  );

  const apply = useCallback(
    (id: string): S | null => {
      const p = readStore<S>(scope).presets.find((x) => x.id === id);
      return p ? p.state : null;
    },
    [scope],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const next = readStore<S>(scope).presets.map((p) =>
        p.id === id ? { ...p, name: trimmed } : p,
      );
      persist(next);
    },
    [scope, persist],
  );

  const remove = useCallback(
    (id: string) => {
      const next = readStore<S>(scope).presets.filter((p) => p.id !== id);
      persist(next);
    },
    [scope, persist],
  );

  const setDefault = useCallback(
    (id: string | null) => {
      const next = readStore<S>(scope).presets.map((p) => ({
        ...p,
        isDefault: id !== null && p.id === id,
      }));
      persist(next);
    },
    [scope, persist],
  );

  const getDefault = useCallback((): ReportPreset<S> | null => {
    return readStore<S>(scope).presets.find((p) => p.isDefault) ?? null;
  }, [scope]);

  return { presets, save, apply, rename, remove, setDefault, getDefault };
}

export const REPORT_PRESETS_MAX = MAX_PRESETS;
