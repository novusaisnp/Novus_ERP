// AUDITORIA_NOVA Fase 4: a flag em src/lib/featureFlags.ts só escondia o item
// de menu (sidebarVisibility.ts) — a rota em si ficava aberta pra qualquer
// usuário logado que digitasse a URL direto, mesmo com o módulo desligado.
// Mesmo padrão de AdminRoute, mas checando uma feature flag em vez de role.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { featureFlags, type FeatureFlagKey } from '@/lib/featureFlags';

interface Props {
  children: React.ReactNode;
  flag: FeatureFlagKey;
}

export const FeatureRoute: React.FC<Props> = ({ children, flag }) => {
  if (!featureFlags[flag]) return <Navigate to="/" replace />;
  return <>{children}</>;
};
