import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FiscalStatusBadge from '../FiscalStatusBadge';

describe('FiscalStatusBadge', () => {
  it('não renderiza quando status é vazio', () => {
    const { container } = render(<FiscalStatusBadge status={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('mapeia status conhecidos para labels legíveis', () => {
    render(<FiscalStatusBadge status="autorizada" />);
    expect(screen.getByText(/autorizada/i)).toBeInTheDocument();
  });

  it('fallback para status desconhecido', () => {
    render(<FiscalStatusBadge status="foo" />);
    expect(screen.getByText(/NF-e foo/i)).toBeInTheDocument();
  });

  it('dispara onClick quando clicado', () => {
    const onClick = vi.fn();
    render(<FiscalStatusBadge status="autorizada" onClick={onClick} />);
    fireEvent.click(screen.getByText(/autorizada/i));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('mapeia falha_comunicacao', () => {
    render(<FiscalStatusBadge status="falha_comunicacao" />);
    expect(screen.getByText(/falha de comunicação/i)).toBeInTheDocument();
  });

  it('mostra badge de contingência quando formaEmissao é contingencia', () => {
    render(<FiscalStatusBadge status="autorizada" formaEmissao="contingencia" />);
    expect(screen.getByText(/em contingência/i)).toBeInTheDocument();
  });

  it('não mostra badge de contingência para emissão normal', () => {
    render(<FiscalStatusBadge status="autorizada" formaEmissao="normal" />);
    expect(screen.queryByText(/em contingência/i)).not.toBeInTheDocument();
  });
});
