import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstoqueSection } from './EstoqueSection';
import { Produto } from '@/types/produto';

const produto: Produto = { nome: '', preco_venda: 0, estoque_atual: 10, estoque_minimo: 2, estoque_maximo: 50 };

describe('EstoqueSection', () => {
  it('renderiza valores atuais', () => {
    render(<EstoqueSection formData={produto} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Estoque Atual/)).toHaveValue(10);
    expect(screen.getByLabelText(/Estoque Mínimo/)).toHaveValue(2);
    expect(screen.getByLabelText(/Estoque Máximo/)).toHaveValue(50);
  });

  it('emite 0 quando estoque atual é limpo', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EstoqueSection formData={produto} onChange={onChange} />);
    await user.clear(screen.getByLabelText(/Estoque Atual/));
    expect(onChange).toHaveBeenCalledWith('estoque_atual', 0);
  });

  it('emite undefined quando estoque máximo é limpo', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<EstoqueSection formData={produto} onChange={onChange} />);
    await user.clear(screen.getByLabelText(/Estoque Máximo/));
    expect(onChange).toHaveBeenCalledWith('estoque_maximo', undefined);
  });
});
