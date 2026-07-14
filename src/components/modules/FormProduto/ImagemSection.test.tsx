import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImagemSection } from './ImagemSection';
import { Produto } from '@/types/produto';

describe('ImagemSection', () => {
  it('mostra área de upload quando sem imagem', () => {
    render(<ImagemSection formData={{ nome: '', preco_venda: 0, imagem_url: '' }} onChange={vi.fn()} />);
    expect(screen.getByText(/Clique para fazer upload/i)).toBeInTheDocument();
  });

  it('mostra preview e permite remover imagem', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const produto: Produto = { nome: '', preco_venda: 0, imagem_url: 'blob:x' };
    render(<ImagemSection formData={produto} onChange={onChange} />);
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'blob:x');
    await user.click(screen.getByRole('button', { name: /Remover Imagem/i }));
    expect(onChange).toHaveBeenCalledWith('imagem_url', '');
  });
});
