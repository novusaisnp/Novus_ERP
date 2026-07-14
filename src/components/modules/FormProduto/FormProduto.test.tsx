import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useCategorias', () => ({
  useCategorias: () => ({ data: [] }),
}));

vi.mock('../ProdutoFornecedorList', () => ({
  ProdutoFornecedorList: () => <div data-testid="produto-fornecedor-list" />,
}));

import { FormProduto } from '../FormProduto';

describe('FormProduto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título "Novo Produto" quando não há produto', () => {
    render(<FormProduto isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('Novo Produto')).toBeInTheDocument();
  });

  it('renderiza título "Editar Produto" quando há produto', () => {
    render(
      <FormProduto
        isOpen
        produto={{ id: '1', nome: 'X', preco_venda: 10 }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Editar Produto')).toBeInTheDocument();
    expect(screen.getByTestId('produto-nome-input')).toHaveValue('X');
  });

  it('submete formulário e chama onSubmit com dados atuais', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <FormProduto
        isOpen
        produto={{ id: '1', nome: 'A', preco_venda: 20 }}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByTestId('produto-salvar-btn'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ nome: 'A', preco_venda: 20 }));
  });

  it('não fecha quando onSubmit retorna false', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <FormProduto
        isOpen
        produto={{ id: '1', nome: 'A', preco_venda: 20 }}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByTestId('produto-salvar-btn'));
    await Promise.resolve();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('botão cancelar chama onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FormProduto isOpen onClose={onClose} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('desabilita botões quando loading', () => {
    render(<FormProduto isOpen loading onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('produto-salvar-btn')).toBeDisabled();
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });
});
