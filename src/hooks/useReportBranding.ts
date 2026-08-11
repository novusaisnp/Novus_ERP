import { useMemo } from 'react';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import type { ReportBranding } from '@/utils/reportExportShared';

export interface UseReportBrandingOptions {
  /** Empresa cujo dado está sendo exportado, quando conhecida (multi-empresa) — tem
   * prioridade sobre a empresa ativa. */
  preferredEmpresaId?: string | null;
}

export interface UseReportBrandingResult {
  branding: ReportBranding | null;
  isLoading: boolean;
}

/**
 * Resolve nome/logo/cor da empresa representada pra branding de relatório exportado.
 * Extraído da duplicação entre financeiro/Relatorios, useFluxoCaixaExport e vendas/Relatorios.
 */
export const useReportBranding = (options?: UseReportBrandingOptions): UseReportBrandingResult => {
  const { empresas } = useEmpresasRepresentadas();
  const { data: logosMap, isLoading } = useEmpresasLogosMap(empresas);

  const branding = useMemo(() => {
    const preferred = options?.preferredEmpresaId
      ? empresas.find((item) => item.id === options.preferredEmpresaId)
      : undefined;
    const empresa = preferred ?? empresas.find((item) => item.ativo !== false) ?? empresas[0];
    if (!empresa?.id) return null;
    const cfg = (empresa.configuracoes as Record<string, unknown> | null | undefined) ?? {};
    return {
      companyName: empresa.nome,
      logoUrl: logosMap?.get(empresa.id) ?? null,
      primaryColor: typeof cfg.primary_color === 'string' ? cfg.primary_color : null,
    };
  }, [empresas, logosMap, options?.preferredEmpresaId]);

  return { branding, isLoading };
};

export default useReportBranding;
