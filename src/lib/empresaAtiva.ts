import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'novus_representada_ativa_id';

// Fonte única de "qual empresa representada é a atual" — antes disso existiam ~23 cópias desta
// mesma checagem espalhadas pelos services, todas assumindo que get_user_empresa_id() nunca
// retorna null. Passa a retornar null pra usuários sem empresa fixa (ex. novus_owner), que
// escolhem uma no seletor (src/pages/auth/SelecionarEmpresa.tsx) e ficam salvos aqui.
export async function getEmpresaAtivaId(): Promise<string | null> {
  const { data } = await supabase.rpc('get_user_empresa_id');
  if (data) return data;

  const storedId = localStorage.getItem(STORAGE_KEY);
  if (!storedId) return null;

  const { data: empresa, error } = await supabase
    .from('empresas_representadas')
    .select('id')
    .eq('id', storedId)
    .maybeSingle();

  if (error) {
    console.warn('[EmpresaAtiva] Não foi possível validar a empresa ativa:', error);
    return storedId;
  }

  if (!empresa) {
    clearEmpresaAtivaId();
    return null;
  }

  return storedId;
}

export async function getEmpresaAtivaIdOuFalha(): Promise<string> {
  const id = await getEmpresaAtivaId();
  if (!id) throw new Error('Empresa não identificada para o usuário atual.');
  return id;
}

export function setEmpresaAtivaId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearEmpresaAtivaId(): void {
  localStorage.removeItem(STORAGE_KEY);
}
