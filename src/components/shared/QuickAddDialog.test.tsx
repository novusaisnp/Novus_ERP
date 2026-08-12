import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickAddDialog, type QuickAddResult, type QuickAddValues } from './QuickAddDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { QuickAddLookup } from './QuickAddDialog';

const created: QuickAddResult = { id: 'novo-id', nome: 'Novo' };

function Harness({
  onCreate,
  onCreated = vi.fn(),
}: {
  onCreate: (values: QuickAddValues) => Promise<QuickAddResult>;
  onCreated?: (result: QuickAddResult) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reabrir</button>
      <QuickAddDialog
        open={open}
        onOpenChange={setOpen}
        title="Novo cadastro"
        showCode
        onCreate={onCreate}
        onCreated={onCreated}
      />
    </>
  );
}

describe('QuickAddDialog', () => {
  it('valida nome obrigatório', async () => {
    const onCreate = vi.fn();
    render(<Harness onCreate={onCreate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome é obrigatório.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('aplica trim, seleciona o criado e fecha no sucesso', async () => {
    const onCreate = vi.fn().mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<Harness onCreate={onCreate} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: '  Novo  ' } });
    fireEvent.change(screen.getByLabelText('Código / Sigla'), { target: { value: '  N  ' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: '  Teste  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(onCreate).toHaveBeenCalledWith({ nome: 'Novo', codigo: 'N', descricao: 'Teste' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mantém o diálogo e os valores em erro', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Nome duplicado'));
    render(<Harness onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Duplicado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nome duplicado');
    expect(screen.getByLabelText('Nome *')).toHaveValue('Duplicado');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('bloqueia as ações enquanto salva', async () => {
    let resolve!: (value: QuickAddResult) => void;
    const onCreate = vi.fn(() => new Promise<QuickAddResult>((done) => { resolve = done; }));
    render(<Harness onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolve(created);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancela sem criar e limpa o formulário auxiliar', async () => {
    const onCreate = vi.fn();
    render(<Harness onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Descartar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));

    expect(await screen.findByLabelText('Nome *')).toHaveValue('');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('não envia o formulário pai ao salvar', async () => {
    const parentSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={parentSubmit}>
        <Harness onCreate={vi.fn().mockResolvedValue(created)} />
      </form>,
    );

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Novo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it('mantém o diálogo pai e seus valores ao cancelar o auxiliar', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Formulário pai</DialogTitle>
          <label htmlFor="parent-value">Valor pai</label>
          <input id="parent-value" defaultValue="Preservar" />
          <QuickAddLookup
            title="Novo auxiliar"
            tooltip="Cadastrar auxiliar"
            onCreate={vi.fn()}
            onCreated={vi.fn()}
          />
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar auxiliar' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Novo auxiliar' })).getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('dialog', { name: 'Formulário pai' })).toBeVisible();
    expect(screen.getByLabelText('Valor pai')).toHaveValue('Preservar');
  });
});
