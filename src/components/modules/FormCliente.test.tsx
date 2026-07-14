import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// --- Mocks de serviços/hooks (evita network e side-effects) ------------------

vi.mock('@/services/cnpjApi', () => ({
  consultarCEP: vi.fn().mockResolvedValue(null),
  consultarCNPJ: vi.fn().mockResolvedValue(null),
  formatarCPF: (v: string) => v,
  formatarCNPJ: (v: string) => v,
  formatarCEP: (v: string) => v,
  validarCPF: () => true,
}));

vi.mock('@/hooks/useCnpjLookup', () => ({
  useCnpjLookupImperative: () => vi.fn().mockResolvedValue(null),
}));

vi.mock('@/hooks/useSetores', () => ({
  useSetores: () => ({ setores: [], loading: false }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// --- Stubs para managers internos (mantêm árvore leve) -----------------------

vi.mock('@/components/modules/TelefoneManager', () => ({
  TelefoneManager: () => <div data-testid="telefone-manager" />,
}));
vi.mock('@/components/modules/clientes/EmailManager', () => ({
  EmailManager: () => <div data-testid="email-manager" />,
}));
vi.mock('@/components/modules/clientes/ContatoEmpresaManager', () => ({
  ContatoEmpresaManager: () => <div data-testid="contato-empresa-manager" />,
}));
vi.mock('@/components/modules/clientes/CNAEAutocomplete', () => ({
  CNAEAutocomplete: () => <div data-testid="cnae-autocomplete" />,
}));
vi.mock('@/components/modules/clientes/MultiSelectComunicacao', () => ({
  MultiSelectComunicacao: () => <div data-testid="multi-select-comunicacao" />,
}));
vi.mock('@/components/modules/clientes/CreditoPagamentoSection', () => ({
  CreditoPagamentoSection: () => <div data-testid="credito-pagamento" />,
}));
vi.mock('@/components/modules/DocumentUpload', () => ({
  DocumentUpload: () => <div data-testid="document-upload" />,
}));

import { FormCliente } from './FormCliente';

describe('FormCliente (integração leve)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza seções principais sem erros', () => {
    render(<FormCliente onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Tipo de Cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/Dados Básicos/i)).toBeInTheDocument();
    expect(screen.getByText(/Endereço/i)).toBeInTheDocument();
  });

  it('inicia com Pessoa Física selecionada por padrão', () => {
    render(<FormCliente onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Pessoa Física/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('alterna para Pessoa Jurídica e exibe seção "Contato na Empresa"', async () => {
    const user = userEvent.setup();
    render(<FormCliente onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Pessoa Jurídica/i }));
    expect(screen.getByText(/Contato na Empresa/i)).toBeInTheDocument();
    expect(screen.getByText(/Qualificação Fiscal/i)).toBeInTheDocument();
  });

  it('bloqueia submit quando "Nome" (campo obrigatório) está vazio', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<FormCliente onSave={onSave} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submete o formulário chamando onSave com dados preenchidos', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<FormCliente onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByTestId('cliente-nome-input'), 'João Teste');
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      nome: 'João Teste',
      tipo: 'F',
    });
  });

  it('botão "Cancelar" chama onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<FormCliente onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('pré-preenche o formulário quando recebe um cliente existente', () => {
    render(
      <FormCliente
        onSave={vi.fn()}
        onCancel={vi.fn()}
        cliente={{ id: 'x', nome: 'Empresa X', tipo: 'J' }}
      />,
    );
    expect(screen.getByTestId('cliente-nome-input')).toHaveValue('Empresa X');
    expect(screen.getByRole('button', { name: /Pessoa Jurídica/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
