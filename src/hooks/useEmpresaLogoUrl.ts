import { useQuery } from '@tanstack/react-query';
import { empresasRepresentadasService } from '@/services/empresasRepresentadasService';

/**
 * Resolve o logo de uma empresa representada (persistido em configuracoes.logo_path
 * do bucket 'empresa-logos') em uma URL assinada usável no <img> e no PDF.
 */
export const useEmpresaLogoUrl = (
  empresaId: string | null | undefined,
  logoPath: string | null | undefined,
) => {
  return useQuery({
    queryKey: ['empresa-logo-url', empresaId, logoPath],
    enabled: !!empresaId && !!logoPath,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      if (!logoPath) return null;
      return empresasRepresentadasService.getSignedUrl('empresa-logos', logoPath, 3600);
    },
  });
};
