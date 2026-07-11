import { useQuery } from '@tanstack/react-query';
import { empresasRepresentadasService } from '@/services/empresasRepresentadasService';

interface EmpresaLogoInput {
  id?: string;
  configuracoes?: Record<string, unknown> | null;
}

/**
 * Recebe a lista de empresas representadas e retorna um Map<empresaId, signedUrl>
 * para cada uma que tenha logo_path cadastrado em configuracoes.
 */
export const useEmpresasLogosMap = (empresas: EmpresaLogoInput[] | undefined) => {
  const chaves = (empresas ?? [])
    .map((e) => {
      const cfg = (e.configuracoes as Record<string, unknown> | undefined) ?? {};
      const path = typeof cfg.logo_path === 'string' ? cfg.logo_path : '';
      return e.id && path ? { id: e.id, path } : null;
    })
    .filter((v): v is { id: string; path: string } => v !== null);

  return useQuery({
    queryKey: ['empresas-logos-map', chaves.map((k) => `${k.id}:${k.path}`).join('|')],
    enabled: chaves.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const entries = await Promise.all(
        chaves.map(async (k) => {
          const url = await empresasRepresentadasService.getSignedUrl(
            'empresa-logos',
            k.path,
            3600,
          );
          return [k.id, url] as const;
        }),
      );
      return new Map<string, string | null>(entries);
    },
  });
};
