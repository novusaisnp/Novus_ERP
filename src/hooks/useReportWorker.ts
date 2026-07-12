// Hook para agregação off-thread (P4.3) com fallback inline.
// Ativa worker quando dataset.length > threshold OU média inline > 120ms.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aggregatePairs,
  type AggPair,
  type AggRequest,
  type AggResponse,
} from '@/workers/relatoriosAggCore';
import type { AggregatedRow } from '@/utils/relatoriosAgg';

interface UseReportWorkerOptions {
  threshold?: number; // default 5000
  slowMs?: number; // default 120
}

export interface ReportWorkerResult {
  rows: AggregatedRow[];
  elapsedMs: number;
  usedWorker: boolean;
}

interface AggregateFn {
  (pairs: AggPair[]): Promise<ReportWorkerResult>;
}

export function useReportWorker(options: UseReportWorkerOptions = {}): {
  aggregate: AggregateFn;
  workerAvailable: boolean;
} {
  const threshold = options.threshold ?? 5000;
  const slowMs = options.slowMs ?? 120;
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, (r: AggResponse) => void>>(new Map());
  const inlineTimesRef = useRef<number[]>([]);
  const [workerAvailable, setWorkerAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    try {
      const w = new Worker(new URL('../workers/relatoriosWorker.ts', import.meta.url), {
        type: 'module',
      });
      w.addEventListener('message', (event: MessageEvent<AggResponse>) => {
        const cb = pendingRef.current.get(event.data.id);
        if (cb) {
          cb(event.data);
          pendingRef.current.delete(event.data.id);
        }
      });
      workerRef.current = w;
      setWorkerAvailable(true);
    } catch (err) {
      console.warn('Worker indisponível, usando fallback inline:', err);
      workerRef.current = null;
      setWorkerAvailable(false);
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const runInline = useCallback((pairs: AggPair[]): ReportWorkerResult => {
    const start = performance.now();
    const rows = aggregatePairs(pairs);
    const elapsedMs = performance.now() - start;
    inlineTimesRef.current.push(elapsedMs);
    if (inlineTimesRef.current.length > 10) inlineTimesRef.current.shift();
    return { rows, elapsedMs, usedWorker: false };
  }, []);

  const avgInline = (): number => {
    const arr = inlineTimesRef.current;
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const aggregate = useCallback<AggregateFn>(
    async (pairs) => {
      const shouldOffload =
        workerRef.current !== null && (pairs.length > threshold || avgInline() > slowMs);

      if (!shouldOffload) {
        return runInline(pairs);
      }

      const worker = workerRef.current;
      if (!worker) return runInline(pairs);

      return new Promise<ReportWorkerResult>((resolve) => {
        const id = `agg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        pendingRef.current.set(id, (r) => {
          resolve({ rows: r.rows, elapsedMs: r.elapsedMs, usedWorker: true });
        });
        const req: AggRequest = { id, pairs };
        worker.postMessage(req);
      });
    },
    [threshold, slowMs, runInline],
  );

  return { aggregate, workerAvailable };
}
