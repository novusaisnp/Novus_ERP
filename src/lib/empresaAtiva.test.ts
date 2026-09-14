import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => rpcMock(...args) } }));

// Achado A05 (AUDITORIA_PRONTIDAO_MERCADO_2026-09-13.md): getEmpresaAtivaId() priorizava
// get_user_empresa_id() (primeira empresa por data de vínculo) sobre a seleção real do
// usuário salva em localStorage. Estes testes travam o comportamento corrigido.
describe('getEmpresaAtivaId', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    localStorage.clear();
  });

  it('resolve automaticamente quando o usuário só tem acesso a 1 empresa', async () => {
    rpcMock.mockResolvedValue({ data: [{ representada_id: 'unica' }], error: null });
    const { getEmpresaAtivaId } = await import('./empresaAtiva');
    await expect(getEmpresaAtivaId()).resolves.toBe('unica');
  });

  it('prioriza a seleção salva quando ela ainda é uma empresa válida do usuário (regressão do bug real)', async () => {
    rpcMock.mockResolvedValue({
      data: [{ representada_id: 'mais-antiga' }, { representada_id: 'selecionada' }],
      error: null,
    });
    const { getEmpresaAtivaId, setEmpresaAtivaId } = await import('./empresaAtiva');
    setEmpresaAtivaId('selecionada');
    await expect(getEmpresaAtivaId()).resolves.toBe('selecionada');
  });

  it('retorna null (força seleção) quando há 2+ empresas e nenhuma seleção salva', async () => {
    rpcMock.mockResolvedValue({
      data: [{ representada_id: 'a' }, { representada_id: 'b' }],
      error: null,
    });
    const { getEmpresaAtivaId } = await import('./empresaAtiva');
    await expect(getEmpresaAtivaId()).resolves.toBeNull();
  });

  it('limpa e retorna null quando a seleção salva não é mais uma empresa acessível', async () => {
    rpcMock.mockResolvedValue({
      data: [{ representada_id: 'a' }, { representada_id: 'b' }],
      error: null,
    });
    const { getEmpresaAtivaId, setEmpresaAtivaId } = await import('./empresaAtiva');
    setEmpresaAtivaId('empresa-antiga-sem-acesso');
    await expect(getEmpresaAtivaId()).resolves.toBeNull();
    expect(localStorage.getItem('novus_representada_ativa_id')).toBeNull();
  });

  it('retorna null quando o usuário não tem nenhuma empresa disponível', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const { getEmpresaAtivaId } = await import('./empresaAtiva');
    await expect(getEmpresaAtivaId()).resolves.toBeNull();
  });

  it('não reconsulta get_empresas_disponiveis a cada chamada (cache curto)', async () => {
    rpcMock.mockResolvedValue({ data: [{ representada_id: 'unica' }], error: null });
    const { getEmpresaAtivaId } = await import('./empresaAtiva');
    await getEmpresaAtivaId();
    await getEmpresaAtivaId();
    await getEmpresaAtivaId();
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('setEmpresaAtivaId invalida o cache na hora, sem esperar o TTL', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ representada_id: 'a' }, { representada_id: 'b' }],
      error: null,
    });
    const { getEmpresaAtivaId, setEmpresaAtivaId } = await import('./empresaAtiva');
    await expect(getEmpresaAtivaId()).resolves.toBeNull();

    rpcMock.mockResolvedValueOnce({
      data: [{ representada_id: 'a' }, { representada_id: 'b' }],
      error: null,
    });
    setEmpresaAtivaId('b');
    await expect(getEmpresaAtivaId()).resolves.toBe('b');
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});

describe('getEmpresaAtivaIdOuFalha', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    localStorage.clear();
  });

  it('lança erro quando não há empresa resolvível', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const { getEmpresaAtivaIdOuFalha } = await import('./empresaAtiva');
    await expect(getEmpresaAtivaIdOuFalha()).rejects.toThrow('Empresa não identificada');
  });
});
