import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedidasSection } from './MedidasSection';
import { Produto } from '@/types/produto';

const produto: Produto = { nome: '', preco_venda: 0, peso: 1.5, altura: 2, largura: 3, comprimento: 4 };

describe('MedidasSection', () => {
  it('renderiza valores atuais das dimensões', () => {
    render(<MedidasSection formData={produto} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Peso/)).toHaveValue(1.5);
    expect(screen.getByLabelText(/Altura/)).toHaveValue(2);
  });

  it('chama onChange com número parseado ao digitar', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MedidasSection formData={{ nome: '', preco_venda: 0 }} onChange={onChange} />);
    await user.type(screen.getByLabelText(/Peso/), '7');
    expect(onChange).toHaveBeenCalledWith('peso', 7);
  });

  it('emite undefined ao limpar campo numérico', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MedidasSection formData={produto} onChange={onChange} />);
    await user.clear(screen.getByLabelText(/Peso/));
    expect(onChange).toHaveBeenCalledWith('peso', undefined);
  });
});
