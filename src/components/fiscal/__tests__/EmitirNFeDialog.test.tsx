import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmitirNFeDialog from '../EmitirNFeDialog';
import type { FiscalFunctionError } from '@/services/fiscal/emissaoService';

const mutateAsync = vi.fn();
vi.mock('@/hooks/fiscal/useEmissaoNFe', () => ({
  useEmitirNFe: () => ({ mutateAsync }),
}));

const venda = { id: 'venda-1', numero_venda: 42, cliente_nome: 'Cliente Teste', valor_total: 100, qtd_itens: 2 };

const sefazIndisponivelErro = (): FiscalFunctionError => {
  const err = new Error('SEFAZ fora do ar.') as FiscalFunctionError;
  err.code = 'sefaz_indisponivel';
  err.documentoId = 'doc-1';
  return err;
};

describe('EmitirNFeDialog — contingência de NFC-e', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não mostra opção de contingência antes de qualquer tentativa', () => {
    render(<EmitirNFeDialog open onOpenChange={() => {}} venda={venda} tipo="NFCE" />);
    expect(screen.queryByText(/emitir em contingência/i)).not.toBeInTheDocument();
  });

  it('oferece "emitir em contingência" quando o backend sinaliza sefaz_indisponivel', async () => {
    mutateAsync.mockRejectedValueOnce(sefazIndisponivelErro());
    render(<EmitirNFeDialog open onOpenChange={() => {}} venda={venda} tipo="NFCE" />);

    fireEvent.click(screen.getByText('Confirmar emissão'));

    await waitFor(() => expect(screen.getByRole('button', { name: /emitir em contingência/i })).toBeInTheDocument());
    expect(mutateAsync).toHaveBeenCalledWith({ vendaId: 'venda-1', tipo: 'NFCE', contingencia: false });
  });

  it('reemite com contingencia:true ao clicar no botão de contingência', async () => {
    mutateAsync.mockRejectedValueOnce(sefazIndisponivelErro());
    mutateAsync.mockResolvedValueOnce({ documento_id: 'doc-1', forma_emissao: 'contingencia' });
    const onEmitida = vi.fn();
    render(<EmitirNFeDialog open onOpenChange={() => {}} venda={venda} tipo="NFCE" onEmitida={onEmitida} />);

    fireEvent.click(screen.getByText('Confirmar emissão'));
    await waitFor(() => screen.getByRole('button', { name: /emitir em contingência/i }));

    fireEvent.click(screen.getByRole('button', { name: /emitir em contingência/i }));

    await waitFor(() => expect(onEmitida).toHaveBeenCalledWith('doc-1'));
    expect(mutateAsync).toHaveBeenLastCalledWith({ vendaId: 'venda-1', tipo: 'NFCE', contingencia: true });
  });

  it('não oferece contingência para NF-e (modelo 55)', async () => {
    mutateAsync.mockRejectedValueOnce(sefazIndisponivelErro());
    render(<EmitirNFeDialog open onOpenChange={() => {}} venda={venda} tipo="NFE" />);

    fireEvent.click(screen.getByText('Confirmar emissão'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(screen.queryByText(/emitir em contingência/i)).not.toBeInTheDocument();
  });
});
