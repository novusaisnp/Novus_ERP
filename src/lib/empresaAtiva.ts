import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'novus_representada_ativa_id';

interface EmpresaDisponivel {
  representada_id: string;
}

// Cache curtíssimo em memória: getEmpresaAtivaId() é chamado a cada operação de service
// (fora do React Query — ver getEmpresaAtivaIdOuFalha, usado por ~65 services), então evita
// reconsultar get_empresas_disponiveis() (JOIN com centelha.responsaveis) a cada chamada.
// TTL curto o bastante pra refletir uma troca de empresa quase na hora; setEmpresaAtivaId/
// clearEmpresaAtivaId também invalidam na hora, sem esperar o TTL.
let cacheDisponiveis: { opcoes: EmpresaDisponivel[]; expiraEm: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function getEmpresasDisponiveis(): Promise<EmpresaDisponivel[]> {
  if (cacheDisponiveis && Date.now() < cacheDisponiveis.expiraEm) return cacheDisponiveis.opcoes;
  const { data, error } = await supabase.rpc('get_empresas_disponiveis');
  if (error) {
    console.warn('[EmpresaAtiva] Não foi possível listar as empresas disponíveis:', error);
    return [];
  }
  const opcoes = (data ?? []) as EmpresaDisponivel[];
  cacheDisponiveis = { opcoes, expiraEm: Date.now() + CACHE_TTL_MS };
  return opcoes;
}

// Fonte única de "qual empresa representada é a atual" — antes disso existiam ~23 cópias desta
// mesma checagem espalhadas pelos services, todas assumindo que get_user_empresa_id() nunca
// retorna null. Passa a retornar null pra usuários sem empresa fixa (ex. novus_owner) ou
// vinculados a mais de uma empresa, que escolhem uma no seletor
// (src/pages/auth/SelecionarEmpresa.tsx) e ficam salvos aqui.
//
// Achado A05 (AUDITORIA_PRONTIDAO_MERCADO_2026-09-13.md, corrigido 2026-09-14): a versão
// anterior chamava get_user_empresa_id() primeiro e usava o resultado sempre que truthy —
// mas essa RPC devolve `ORDER BY created_at ASC LIMIT 1` (a primeira empresa vinculada ao
// usuário, nunca uma seleção ativa real), e um usuário vinculado a 2+ empresas SEMPRE tem
// esse valor truthy. Na prática, a seleção do usuário no seletor (salva aqui via
// setEmpresaAtivaId) era ignorada na consulta seguinte — o seletor virava decorativo assim
// que ORG-1 (matriz/filial, 2026-08-30) passou a permitir 2+ `user_roles` por usuário. A
// validação do valor salvo também só conferia se a empresa existia globalmente
// (`empresas_representadas`), não se o usuário atual tinha acesso a ela.
//
// Ordem corrigida: (1) seleção salva, só se ainda estiver entre as empresas que o usuário
// realmente acessa agora; (2) resolução automática só quando há exatamente 1 opção (mesma
// UX de sempre pra "a maioria", que tem uma única empresa); (3) qualquer ambiguidade real
// (2+ empresas sem seleção válida) retorna null — EmpresaGate manda pro seletor, nunca
// escolhe silenciosamente por data de vínculo.
export async function getEmpresaAtivaId(): Promise<string | null> {
  const storedId = localStorage.getItem(STORAGE_KEY);
  const opcoes = await getEmpresasDisponiveis();

  if (storedId && opcoes.some((o) => o.representada_id === storedId)) {
    return storedId;
  }

  if (opcoes.length === 1) {
    return opcoes[0].representada_id;
  }

  if (storedId) clearEmpresaAtivaId();
  return null;
}

export async function getEmpresaAtivaIdOuFalha(): Promise<string> {
  const id = await getEmpresaAtivaId();
  if (!id) throw new Error('Empresa não identificada para o usuário atual.');
  return id;
}

export function setEmpresaAtivaId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
  cacheDisponiveis = null;
}

export function clearEmpresaAtivaId(): void {
  localStorage.removeItem(STORAGE_KEY);
  cacheDisponiveis = null;
}
