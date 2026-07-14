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
});
