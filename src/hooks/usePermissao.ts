import { useQuery } from '@tanstack/react-query';
import { fetchPermissoes, fetchPode } from '@/services/permissoesService';

/**
 * Permissão granular do usuário atual para um único código do catálogo.
 * Enquanto carrega, ou se a consulta falhar, nega — igual ao padrão já usado
 * em usePermissoesFinanceiras: liberar na dúvida esconderia uma falha de
 * autorização atrás de um botão visível.
 */
export function usePermissao(codigo: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['permissao', codigo],
    queryFn: () => fetchPode(codigo),
    staleTime: 5 * 60 * 1000,
  });

  return { permitido: data === true, isLoading };
}

/**
 * Várias permissões do usuário atual numa única chamada de rede — para telas
 * com mais de um botão/ação gateados (ex.: criar + editar + excluir).
 */
export function usePermissoes(codigos: string[]) {
  const chave = [...codigos].sort();
  const { data, isLoading } = useQuery({
    queryKey: ['permissoes', chave],
    queryFn: () => fetchPermissoes(codigos),
    staleTime: 5 * 60 * 1000,
    enabled: codigos.length > 0,
  });

  const mapa = data ?? {};
  const permitido = (codigo: string) => mapa[codigo] === true;

  return { permitido, mapa, isLoading };
}
