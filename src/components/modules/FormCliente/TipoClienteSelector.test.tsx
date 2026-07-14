import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TipoClienteSelector } from './TipoClienteSelector';

describe('TipoClienteSelector', () => {
  it('renderiza ambos os botões (PF e PJ)', () => {
    render(<TipoClienteSelector value="F" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pessoa Física/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pessoa Jurídica/i })).toBeInTheDocument();
  });

  it('marca botão PF como selecionado quando value="F"', () => {
    render(<TipoClienteSelector value="F" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pessoa Física/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Pessoa Jurídica/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('marca botão PJ como selecionado quando value="J"', () => {
    render(<TipoClienteSelector value="J" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pessoa Jurídica/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('dispara onChange("J") ao clicar em Pessoa Jurídica', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TipoClienteSelector value="F" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Pessoa Jurídica/i }));
    expect(onChange).toHaveBeenCalledWith('J');
  });

  it('dispara onChange("F") ao clicar em Pessoa Física', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TipoClienteSelector value="J" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Pessoa Física/i }));
    expect(onChange).toHaveBeenCalledWith('F');
  });
});
