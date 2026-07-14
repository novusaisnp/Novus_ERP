import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TipoPessoaSelector } from './TipoPessoaSelector';

describe('TipoPessoaSelector', () => {
  it('renderiza abas para PJ e PF', () => {
    render(<TipoPessoaSelector value="PJ" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Pessoa Jurídica/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pessoa Física/i })).toBeInTheDocument();
  });

  it('marca PJ como selecionada quando value="PJ"', () => {
    render(<TipoPessoaSelector value="PJ" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Pessoa Jurídica/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('marca PF como selecionada quando value="PF"', () => {
    render(<TipoPessoaSelector value="PF" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Pessoa Física/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('chama onChange("PF") ao clicar na aba Pessoa Física', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TipoPessoaSelector value="PJ" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Pessoa Física/i }));
    expect(onChange).toHaveBeenCalledWith('PF');
  });

  it('chama onChange("PJ") ao clicar na aba Pessoa Jurídica', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TipoPessoaSelector value="PF" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Pessoa Jurídica/i }));
    expect(onChange).toHaveBeenCalledWith('PJ');
  });
});
