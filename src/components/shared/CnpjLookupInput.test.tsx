import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CnpjLookupInput } from './CnpjLookupInput';

const { consultarCNPJMock, validarCNPJMock, toastMock } = vi.hoisted(() => ({
  consultarCNPJMock: vi.fn(),
  validarCNPJMock: vi.fn(),
  toastMock: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));

vi.mock('@/services/cnpjApi', () => ({
  consultarCNPJ: consultarCNPJMock,
  validarCNPJ: validarCNPJMock,
  formatarCNPJ: (v: string) =>
    v.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
}));

vi.mock('sonner', () => ({ toast: toastMock }));

const CNPJ = '11222333000181';
const CNPJ_FORMATADO = '11.222.333/0001-81';

function Wrapper({ onLookup, autoLookup }: { onLookup?: (d: any) => void; autoLookup?: boolean }) {
  const [v, setV] = useState('');
  return (
    <CnpjLookupInput value={v} onChange={setV} onLookup={onLookup} autoLookup={autoLookup} />
  );
}

beforeEach(() => {
  consultarCNPJMock.mockReset();
  validarCNPJMock.mockReset();
  toastMock.error.mockReset();
  toastMock.warning.mockReset();
});

describe('CnpjLookupInput — máscara', () => {
  it('aplica máscara ao completar 14 dígitos', async () => {
    validarCNPJMock.mockReturnValue(true);
    consultarCNPJMock.mockResolvedValue({ nome: 'ACME' });
    const user = userEvent.setup();
    render(<Wrapper onLookup={() => {}} />);
    const input = screen.getByPlaceholderText(/00\.000\.000/) as HTMLInputElement;
    await user.type(input, CNPJ);
    expect(input.value).toBe(CNPJ_FORMATADO);
  });

  it('não aplica máscara com menos de 14 dígitos', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = screen.getByPlaceholderText(/00\.000\.000/) as HTMLInputElement;
    await user.type(input, '112223');
    expect(input.value).toBe('112223');
  });
});

describe('CnpjLookupInput — autoLookup', () => {
  it('chama consultarCNPJ e onLookup quando 14 dígitos e CNPJ válido', async () => {
    validarCNPJMock.mockReturnValue(true);
    const data = { nome: 'ACME LTDA', cnpj: CNPJ };
    consultarCNPJMock.mockResolvedValue(data);
    const onLookup = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onLookup={onLookup} />);
    await user.type(screen.getByPlaceholderText(/00\.000\.000/), CNPJ);

    await vi.waitFor(() => expect(consultarCNPJMock).toHaveBeenCalledWith(CNPJ));
    await vi.waitFor(() => expect(onLookup).toHaveBeenCalledWith(data));
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('exibe toast.error e não chama API quando CNPJ inválido', async () => {
    validarCNPJMock.mockReturnValue(false);
    const onLookup = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onLookup={onLookup} />);
    await user.type(screen.getByPlaceholderText(/00\.000\.000/), CNPJ);

    await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('CNPJ inválido'));
    expect(consultarCNPJMock).not.toHaveBeenCalled();
    expect(onLookup).not.toHaveBeenCalled();
  });

  it('exibe toast.warning quando API retorna null', async () => {
    validarCNPJMock.mockReturnValue(true);
    consultarCNPJMock.mockResolvedValue(null);
    const onLookup = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onLookup={onLookup} />);
    await user.type(screen.getByPlaceholderText(/00\.000\.000/), CNPJ);

    await vi.waitFor(() => expect(toastMock.warning).toHaveBeenCalledWith('CNPJ não encontrado na base pública'));
    expect(onLookup).not.toHaveBeenCalled();
  });

  it('NÃO faz auto-lookup quando autoLookup=false até o onBlur', async () => {
    validarCNPJMock.mockReturnValue(true);
    consultarCNPJMock.mockResolvedValue({ nome: 'ACME' });
    const onLookup = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper onLookup={onLookup} autoLookup={false} />);
    const input = screen.getByPlaceholderText(/00\.000\.000/);
    await user.type(input, CNPJ);

    expect(consultarCNPJMock).not.toHaveBeenCalled();
    // blur agora dispara
    await user.tab();
    await vi.waitFor(() => expect(consultarCNPJMock).toHaveBeenCalled());
  });

  it('não chama lookup quando onLookup não fornecido', async () => {
    validarCNPJMock.mockReturnValue(true);
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.type(screen.getByPlaceholderText(/00\.000\.000/), CNPJ);
    expect(consultarCNPJMock).not.toHaveBeenCalled();
  });
});
