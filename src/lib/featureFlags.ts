// SM1-D: Feature flags para módulos fora do escopo do go-live inicial.
// Ative individualmente por env quando o módulo for aprovado para produção.
//
// Padrão: `false` — módulo oculto do sidebar e das rotas (AUDITORIA_NOVA Fase 4:
// a flag agora também protege a rota via <FeatureRoute>, não só o item de menu —
// antes digitar a URL direto abria a tela pra qualquer usuário logado mesmo com
// a flag desligada).
// Para habilitar em preview/dev, defina no `.env`:
//   VITE_FEATURE_ESTOQUE_EXT=true
//   VITE_FEATURE_SYNC_DASHBOARD=true   (também exige role admin)

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const boolFlag = (key: string): boolean => {
  const v = (env?.[key] ?? '').toString().trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'on';
};

export const featureFlags = {
  estoqueExt: boolFlag('VITE_FEATURE_ESTOQUE_EXT'),
  syncDashboard: boolFlag('VITE_FEATURE_SYNC_DASHBOARD'),
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;

export const isFeatureEnabled = (key: FeatureFlagKey): boolean => featureFlags[key];
