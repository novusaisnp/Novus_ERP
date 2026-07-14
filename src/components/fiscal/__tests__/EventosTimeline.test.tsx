import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventosTimeline from '../EventosTimeline';
import type { FiscalEvento } from '@/hooks/fiscal/useFiscalDocumento';

const ev = (o: Partial<FiscalEvento>): FiscalEvento => ({
  id: crypto.randomUUID(),
  documento_id: 'doc',
  tipo: 'autorizacao',
  status: 'autorizada',
  created_at: new Date().toISOString(),
  sequencia: null,
  justificativa: null,
  protocolo: null,
  motivo_rejeicao: null,
  ...o,
});

describe('EventosTimeline', () => {
  it('mostra estado de carregamento', () => {
    render(<EventosTimeline eventos={[]} loading />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('mostra estado vazio', () => {
    render(<EventosTimeline eventos={[]} />);
    expect(screen.getByText(/nenhum evento/i)).toBeInTheDocument();
  });

  it('renderiza cada evento com tipo e protocolo', () => {
    render(
      <EventosTimeline
        eventos={[
          ev({ tipo: 'autorizacao', protocolo: 'PROT-1' }),
          ev({ tipo: 'cce', sequencia: 2, justificativa: 'Correção de texto' }),
        ]}
      />,
    );
    expect(screen.getByText(/autorizacao/i)).toBeInTheDocument();
    expect(screen.getByText(/PROT-1/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(screen.getByText(/Correção de texto/)).toBeInTheDocument();
  });
});
