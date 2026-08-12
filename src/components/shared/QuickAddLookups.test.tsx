import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  QuickAddCargo,
  QuickAddCentroCusto,
  QuickAddLocalizacao,
  QuickAddSetor,
} from './QuickAddLookups';
import { cargoService } from '@/services/cargoService';
import { setorService } from '@/services/setorService';
import { centroCustoService } from '@/services/centroCustoService';
import { localizacaoService } from '@/services/localizacaoService';

vi.mock('@/services/cargoService', () => ({ cargoService: { createCargo: vi.fn() } }));
vi.mock('@/services/departamentoService', () => ({ departamentoService: { createDepartamento: vi.fn() } }));
vi.mock('@/services/setorService', () => ({ setorService: { createSetor: vi.fn() } }));
vi.mock('@/services/centroCustoService', () => ({ centroCustoService: { create: vi.fn() } }));
vi.mock('@/services/localizacaoService', () => ({ localizacaoService: { create: vi.fn() } }));
vi.mock('@/lib/empresaAtiva', () => ({ getEmpresaAtivaIdOuFalha: vi.fn().mockResolvedValue('empresa-ativa') }));

const renderWithQuery = (ui: React.ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {ui}
  </QueryClientProvider>,
);

const submit = (triggerName: string, nome: string) => {
  fireEvent.click(screen.getByRole('button', { name: triggerName }));
  fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: nome } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
};

describe('cadastros rápidos de lookups', () => {
  it('cria Cargo ativo e seleciona o retorno', async () => {
    vi.mocked(cargoService.createCargo).mockResolvedValue({ id: 'cargo-1', nome: 'Gerente' } as never);
    const onCreated = vi.fn();
    renderWithQuery(<QuickAddCargo onCreated={onCreated} />);

    submit('Cadastrar cargo', ' Gerente ');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'cargo-1', nome: 'Gerente' }));
    expect(cargoService.createCargo).toHaveBeenCalledWith({ nome: 'Gerente', descricao: undefined, ativo: true });
  });

  it('cria Setor herdando o departamento e atualiza a fonte', async () => {
    vi.mocked(setorService.createSetor).mockResolvedValue({ id: 'setor-1', nome: 'Vendas' } as never);
    const onCreated = vi.fn();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderWithQuery(
      <QuickAddSetor departamentoId="dep-1" onCreated={onCreated} onRefresh={onRefresh} />,
    );

    submit('Cadastrar setor', 'Vendas');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'setor-1', nome: 'Vendas' }));
    expect(setorService.createSetor).toHaveBeenCalledWith({
      nome: 'Vendas',
      descricao: undefined,
      departamento_id: 'dep-1',
      ativo: true,
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('cria Centro de Custo com código e seleciona o retorno', async () => {
    vi.mocked(centroCustoService.create).mockResolvedValue({ id: 'cc-1', nome: 'Administrativo' } as never);
    const onCreated = vi.fn();
    renderWithQuery(<QuickAddCentroCusto onCreated={onCreated} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar centro de custo' }));
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Administrativo' } });
    fireEvent.change(screen.getByLabelText('Código / Sigla'), { target: { value: 'ADM' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'cc-1', nome: 'Administrativo' }));
    expect(centroCustoService.create).toHaveBeenCalledWith({
      nome: 'Administrativo', codigo: 'ADM', descricao: undefined, ativo: true,
    });
  });

  it('associa Localização à empresa do formulário e seleciona o retorno', async () => {
    vi.mocked(localizacaoService.create).mockResolvedValue({ id: 'loc-1', nome: 'Depósito' } as never);
    const onCreated = vi.fn();
    renderWithQuery(<QuickAddLocalizacao empresaId="empresa-form" onCreated={onCreated} />);

    submit('Cadastrar localização', 'Depósito');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'loc-1', nome: 'Depósito' }));
    expect(localizacaoService.create).toHaveBeenCalledWith({
      empresa_representada_id: 'empresa-form',
      nome: 'Depósito',
      descricao: null,
      ativo: true,
    });
  });
});
