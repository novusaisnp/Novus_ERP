import { supabase } from '@/integrations/supabase/client';

/**
 * Checagem granular genérica de permissão, resolvida no banco (`public.pode`).
 * A UI apenas reflete essa capacidade — a autorização que vale é a da própria
 * RPC/Edge Function consumida pela ação, que recusa mesmo em chamada direta.
 */
export async function fetchPode(codigo: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('pode', { p_permissao: codigo });
  if (error) throw error;
  return data === true;
}

export async function fetchPermissoes(codigos: string[]): Promise<Record<string, boolean>> {
  if (codigos.length === 0) return {};
  const { data, error } = await supabase.rpc('permissoes_usuario', { p_codigos: codigos });
  if (error) throw error;
  return (data ?? {}) as Record<string, boolean>;
}
