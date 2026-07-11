// SM1-D: Feature flags para módulos fora do escopo do go-live inicial.
// Ative individualmente por env quando o módulo for aprovado para produção.
//
// Padrão: `false` — módulo oculto do sidebar e das rotas.
// Para habilitar em preview/dev, defina no `.env`:
//   VITE_FEATURE_FISCAL=true
//   VITE_FEATURE_SISTEMA_CONFIG=true
//   VITE_FEATURE_ESTOQUE_EXT=true
//   VITE_FEATURE_SYNC_DASHBOARD=true   (também exige role admin)

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const boolFlag = (key: string): boolean => {
  const v = (env?.[key] ?? '').toString().trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'on';
};

export const featureFlags = {
  fiscal: boolFlag('VITE_FEATURE_FISCAL'),
  sistemaConfig: boolFlag('VITE_FEATURE_SISTEMA_CONFIG'),
  estoqueExt: boolFlag('VITE_FEATURE_ESTOQUE_EXT'),
  syncDashboard: boolFlag('VITE_FEATURE_SYNC_DASHBOARD'),
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;

export const isFeatureEnabled = (key: FeatureFlagKey): boolean => featureFlags[key];
