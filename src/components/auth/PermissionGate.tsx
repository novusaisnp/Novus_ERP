import React from 'react';
import { usePermissao } from '@/hooks/usePermissao';

interface Props {
  codigo: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Esconde os filhos até confirmar que o usuário tem a permissão granular
 * indicada (nega enquanto carrega). Isto nunca é a autorização real — cada
 * RPC/Edge Function consumida pelos filhos reconfirma no servidor; este gate
 * só evita mostrar uma ação que vai voltar 403.
 */
export const PermissionGate: React.FC<Props> = ({ codigo, children, fallback = null }) => {
  const { permitido } = usePermissao(codigo);
  return <>{permitido ? children : fallback}</>;
};
