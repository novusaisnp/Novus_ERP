import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrecosSection } from './PrecosSection';
import { Produto } from '@/types/produto';

const produto: Produto = { nome: '', preco_venda: 100, preco_custo: 50, margem_lucro: 100 };

describe('PrecosSection', () => {
  it('renderiza campo de margem com valor atual', () => {
    render(
      <PrecosSection
        formData={produto}
        onChange={vi.fn()}
        onCalcularMargem={vi.fn()}
        onCalcularPrecoVenda={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Margem de Lucro/)).toHaveValue(100);
  });

  it('dispara onCalcularMargem ao clicar no botão de calculadora', async () => {
    const onCalcularMargem = vi.fn();
    const user = userEvent.setup();
    render(
      <PrecosSection
        formData={produto}
        onChange={vi.fn()}
        onCalcularMargem={onCalcularMargem}
        onCalcularPrecoVenda={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[buttons.length - 1]);
    expect(onCalcularMargem).toHaveBeenCalled();
  });

  it('dispara onCalcularPrecoVenda ao sair do campo margem', async () => {
    const onCalcularPrecoVenda = vi.fn();
    const user = userEvent.setup();
    render(
      <PrecosSection
        formData={produto}
        onChange={vi.fn()}
        onCalcularMargem={vi.fn()}
        onCalcularPrecoVenda={onCalcularPrecoVenda}
      />,
    );
    const margem = screen.getByLabelText(/Margem de Lucro/);
    await user.click(margem);
    await user.tab();
    expect(onCalcularPrecoVenda).toHaveBeenCalled();
  });

  it('chama onChange ao alterar margem manualmente', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PrecosSection
        formData={{ nome: '', preco_venda: 0 }}
        onChange={onChange}
        onCalcularMargem={vi.fn()}
        onCalcularPrecoVenda={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/Margem de Lucro/), '5');
    expect(onChange).toHaveBeenCalledWith('margem_lucro', 5);
  });
});
