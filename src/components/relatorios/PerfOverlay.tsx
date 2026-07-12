// Overlay simples de performance (P4.3). Habilitado via ?perf=1.
import { useEffect, useState } from 'react';

interface PerfOverlayProps {
  datasetSize: number;
  inlineMs: number;
  workerMs: number | null;
  usedWorker: boolean;
}

export function PerfOverlay({
  datasetSize,
  inlineMs,
  workerMs,
  usedWorker,
}: PerfOverlayProps): JSX.Element | null {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get('perf') === '1');
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-md p-3 shadow-lg text-xs font-mono space-y-1">
      <div className="font-bold text-primary">⚡ Perf overlay</div>
      <div>dataset: {datasetSize}</div>
      <div>inline: {inlineMs.toFixed(2)}ms</div>
      <div>worker: {workerMs !== null ? `${workerMs.toFixed(2)}ms` : '—'}</div>
      <div>modo ativo: {usedWorker ? '🧵 worker' : '⚙️ inline'}</div>
    </div>
  );
}
