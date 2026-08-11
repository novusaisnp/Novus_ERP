import { describe, expect, it, vi } from 'vitest';

const upsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ upsert })) },
}));

import { preferenciasListagemService } from './preferenciasListagemService';

describe('preferenciasListagemService', () => {
  it('usa exatamente a constraint única do schema ao salvar', async () => {
    await preferenciasListagemService.salvar('user-1', 'empresa-1', 'entidades', ['nome', 'status']);

    expect(upsert).toHaveBeenCalledWith({
      usuario_id: 'user-1',
      empresa_representada_id: 'empresa-1',
      tela: 'entidades',
      colunas_visiveis: ['nome', 'status'],
    }, { onConflict: 'usuario_id,empresa_representada_id,tela' });
  });
});
