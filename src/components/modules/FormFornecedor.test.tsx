import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/cnpjApi', () => ({
  consultarCEP: vi.fn().mockResolvedValue(null),
  consultarCNPJ: vi.fn().mockResolvedValue(null),
  formatarCEP: (v: string) => v,
}));

vi.mock('@/hooks/useCnpjLookup', () => ({
  useCnpjLookupImperative: () => vi.fn().mockResolvedValue(null),
}));

vi.mock('@/components/modules/DocumentUpload', () => ({
  DocumentUpload: () => <div data-testid="document-upload" />,
}));
vi.mock('@/components/modules/TelefoneManager', () => ({
  TelefoneManager: () => <div data-testid="telefone-manager" />,
}));
vi.mock('@/components/modules/DateInput', () => ({
  DateInput: ({ label }: { label: string }) => (
    <div data-testid="date-input">{label}</div>
  ),
}));

import { FormFornecedor } from './FormFornecedor';

describe('FormFornecedor (integração leve)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza abas de tipo e inicia como PJ', () => {
    render(<FormFornecedor onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Pessoa Jurídica/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/Informações da Empresa/i)).toBeInTheDocument();
  });

  it('alterna para PF ao clicar na aba correspondente', async () => {
    const user = userEvent.setup();
    render(<FormFornecedor onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: /Pessoa Física/i }));
    expect(screen.getByText(/Informações Pessoais/i)).toBeInTheDocument();
  });

  it('bloqueia submit quando "Razão Social" (obrigatório em PJ) está vazio', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<FormFornecedor onSave={onSave} onCancel={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submete o formulário PJ chamando onSave', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<FormFornecedor onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/Razão Social/i), 'ACME LTDA');
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      tipo_pessoa: 'PJ',
      razaoSocial: 'ACME LTDA',
    });
  });

  it('botão "Cancelar" chama onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<FormFornecedor onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('pré-preenche formulário ao receber fornecedor existente (PF)', () => {
    render(
      <FormFornecedor
        onSave={vi.fn()}
        onCancel={vi.fn()}
        fornecedor={{ id: 'x', tipo_pessoa: 'PF', nome_completo: 'Maria' }}
      />,
    );
    expect(screen.getByRole('tab', { name: /Pessoa Física/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
  });
});
