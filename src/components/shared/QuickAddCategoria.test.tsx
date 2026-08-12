import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickAddCategoria } from './QuickAddCategoria';
import { categoriaService } from '@/services/categoriaService';

vi.mock('@/services/categoriaService', () => ({ categoriaService: { create: vi.fn() } }));
vi.mock('@/lib/empresaAtiva', () => ({ getEmpresaAtivaIdOuFalha: vi.fn().mockResolvedValue('empresa-1') }));
vi.mock('@/components/modules/FormCategoria', () => ({
  FormCategoria: ({ open, onSubmit }: { open: boolean; onSubmit: (data: object) => Promise<void> }) => open ? (
    <button onClick={() => void onSubmit({
      nome: 'Categoria Nova',
      descricao: '',
      ativo: true,
      plano_conta_receita_id: 'receita-1',
      plano_conta_despesa_id: 'despesa-1',
    })}>
      Salvar categoria completa
    </button>
  ) : null,
}));

describe('QuickAddCategoria', () => {
  it('usa o FormCategoria completo e seleciona a categoria criada', async () => {
    vi.mocked(categoriaService.create).mockResolvedValue({ id: 'cat-1', nome: 'Categoria Nova' } as never);
    const onCreated = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <QuickAddCategoria onCreated={onCreated} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar categoria' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar categoria completa' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'cat-1', nome: 'Categoria Nova' }));
    expect(categoriaService.create).toHaveBeenCalledWith(expect.objectContaining({
      empresa_representada_id: 'empresa-1',
      plano_conta_receita_id: 'receita-1',
      plano_conta_despesa_id: 'despesa-1',
    }));
  });
});
