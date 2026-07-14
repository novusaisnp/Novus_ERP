import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriaSelect, CategoriaOption } from './CategoriaSelect';

const categorias: CategoriaOption[] = [
  { id: 'c1', nome: 'Completa', ativo: true, plano_conta_receita_id: 'r', plano_conta_despesa_id: 'd' },
  { id: 'c2', nome: 'Sem class', ativo: true, plano_conta_receita_id: null, plano_conta_despesa_id: null },
  { id: 'c3', nome: 'Rascunho', ativo: false },
];

describe('CategoriaSelect', () => {
  it('mostra aviso quando não há categoria selecionada', () => {
    render(<CategoriaSelect categorias={categorias} categoriaId={null} onChange={vi.fn()} />);
    expect(screen.getByText(/não terá classificação contábil/i)).toBeInTheDocument();
  });

  it('mostra classificação completa quando categoria válida está selecionada', () => {
    render(<CategoriaSelect categorias={categorias} categoriaId="c1" onChange={vi.fn()} />);
    expect(screen.getByText('Completa')).toBeInTheDocument();
    expect(screen.getByText(/✓ vinculada/)).toBeInTheDocument();
  });

  it('mostra pendente quando categoria selecionada não tem plano de contas', () => {
    render(<CategoriaSelect categorias={categorias} categoriaId="c2" onChange={vi.fn()} />);
    expect(screen.getByText(/Pendente na categoria/)).toBeInTheDocument();
  });

  it('chama onChange com null ao selecionar "Sem categoria"', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CategoriaSelect categorias={categorias} categoriaId="c1" onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Sem categoria'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
