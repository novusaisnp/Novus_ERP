import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriaSelect, CategoriaOption } from './CategoriaSelect';

vi.mock('@/components/shared/QuickAddCategoria', () => ({ QuickAddCategoria: () => null }));

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
    expect(screen.getAllByText('Completa').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/✓ vinculada/).length).toBeGreaterThanOrEqual(2);
  });

  it('mostra pendente quando categoria selecionada não tem plano de contas', () => {
    render(<CategoriaSelect categorias={categorias} categoriaId="c2" onChange={vi.fn()} />);
    expect(screen.getByText(/Pendente na categoria/)).toBeInTheDocument();
  });

  it('renderiza o trigger do select como combobox', () => {
    render(<CategoriaSelect categorias={categorias} categoriaId={null} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
