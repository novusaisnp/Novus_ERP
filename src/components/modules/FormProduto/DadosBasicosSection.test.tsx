import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DadosBasicosSection } from './DadosBasicosSection';
import { Produto } from '@/types/produto';

const baseProduto: Produto = {
  nome: 'Produto X',
  preco_venda: 10,
  codigo: 'A1',
  descricao: 'desc',
  ncm: '111',
  cest: '222',
  categoria_id: null,
};

describe('DadosBasicosSection', () => {
  it('renderiza campos com valores do formData', () => {
    render(<DadosBasicosSection formData={baseProduto} categorias={[]} onChange={vi.fn()} />);
    expect(screen.getByTestId('produto-nome-input')).toHaveValue('Produto X');
    expect(screen.getByLabelText(/^Código$/)).toHaveValue('A1');
    expect(screen.getByLabelText(/NCM/)).toHaveValue('111');
    expect(screen.getByLabelText(/CEST/)).toHaveValue('222');
  });

  it('chama onChange ao digitar no nome', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DadosBasicosSection formData={baseProduto} categorias={[]} onChange={onChange} />);
    await user.type(screen.getByTestId('produto-nome-input'), 'Y');
    expect(onChange).toHaveBeenCalledWith('nome', expect.any(String));
  });

  it('emite código null ao limpar campo', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DadosBasicosSection formData={baseProduto} categorias={[]} onChange={onChange} />);
    await user.clear(screen.getByLabelText(/^Código$/));
    expect(onChange).toHaveBeenCalledWith('codigo', null);
  });
});
