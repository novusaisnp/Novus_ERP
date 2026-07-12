// Web Worker de agregação (P4.3). Executa aggregatePairs off-thread.
/// <reference lib="webworker" />
import { aggregatePairs, type AggRequest, type AggResponse } from './relatoriosAggCore';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<AggRequest>) => {
  const start = performance.now();
  const rows = aggregatePairs(event.data.pairs);
  const response: AggResponse = {
    id: event.data.id,
    rows,
    elapsedMs: performance.now() - start,
  };
  ctx.postMessage(response);
});

export {};
