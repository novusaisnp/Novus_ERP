import { toast } from 'sonner';
import { usuarioService } from '@/services/usuarioService';

type Resultado = { codigo: string; ok: boolean; erro?: string };

async function executar(
  socioId: string,
  chamar: (id: string) => Promise<{ data: { satelites: Resultado[] } | null; error: unknown }>,
  textos: { vazio: string; sucesso: (codigos: string) => string; falha: string },
): Promise<void> {
  try {
    const { data, error } = await chamar(socioId);
    if (error) throw error;

    const satelites = data?.satelites ?? [];
    if (satelites.length === 0) {
      toast.info(textos.vazio);
      return;
    }

    const ok = satelites.filter((s) => s.ok).map((s) => s.codigo);
    if (ok.length > 0) {
      toast.success(textos.sucesso(ok.join(', ')));
    }
    for (const falho of satelites.filter((s) => !s.ok)) {
      toast.warning(`${textos.falha} ${falho.codigo}: ${falho.erro ?? 'erro desconhecido'}`);
    }
  } catch (err) {
    console.error('[centelha-satelites] falhou:', err);
    const msg = err instanceof Error ? err.message : 'erro desconhecido';
    toast.warning(`${textos.falha} satélites: ${msg}`);
  }
}

/**
 * Porta 0.1 — replica o acesso admin do sócio/representante nos satélites licenciados.
 * Falha aqui nunca desfaz a criação do usuário no ERP: o acesso ao hub já vale e o
 * provisionamento é reexecutável pela listagem de usuários.
 */
export function provisionarAdminSatelites(socioId: string): Promise<void> {
  return executar(socioId, (id) => usuarioService.provisionarAdminSatelites(id), {
    vazio: 'Nenhum sistema satélite licenciado para esta empresa — acesso vale só no ERP.',
    sucesso: (codigos) => `Acesso administrativo provisionado em: ${codigos}.`,
    falha: 'Falha ao provisionar em',
  });
}

/**
 * Porta 0.2 — tira o acesso do sócio/representante em todos os satélites licenciados.
 * Precisa rodar ANTES do soft delete do cadastro: a função no ERP resolve o sócio com
 * `deleted_at IS NULL` e não acharia o registro depois.
 */
export function revogarAdminSatelites(socioId: string): Promise<void> {
  return executar(socioId, (id) => usuarioService.revogarAdminSatelites(id), {
    vazio: 'Nenhum sistema satélite licenciado — nada a revogar fora do ERP.',
    sucesso: (codigos) => `Acesso revogado em: ${codigos}.`,
    falha: 'Falha ao revogar em',
  });
}
