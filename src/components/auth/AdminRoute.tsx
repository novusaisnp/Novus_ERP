// SM1-D: gate admin-only para rotas restritas (ex.: SyncDashboard).
// Depende de auth já resolvido via ProtectedRoute (não substitui). Faz uma
// consulta leve a user_roles usando a sessão atual.
//
// AUDITORIA_NOVA Fase 1.5: role='admin' (padrão) escopa a checagem à empresa
// ativa via has_role_for_empresa — admin de uma empresa não passa mais em
// rotas de outra. role='novus_owner' é para rotas de operação interna NOVUS
// (ex.: RelatoriosOps), sem conceito de empresa nenhuma.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { checkHasRole } from '@/utils/authUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

interface Props {
  children: React.ReactNode;
  role?: 'admin' | 'novus_owner';
}

export const AdminRoute: React.FC<Props> = ({ children, role = 'admin' }) => {
  const { user } = useAuth();

  const { data: empresaAtivaId, isLoading: loadingEmpresa } = useQuery({
    queryKey: ['admin-route-empresa-ativa', user?.id ?? null],
    enabled: !!user?.id && role === 'admin',
    queryFn: getEmpresaAtivaId,
    staleTime: 60_000,
  });

  const { data: isAllowed, isLoading: loadingRole } = useQuery({
    queryKey: ['admin-route-check', role, user?.id ?? null, empresaAtivaId ?? null],
    enabled: !!user?.id && (role === 'novus_owner' || empresaAtivaId !== undefined),
    queryFn: () => checkHasRole(user!.id, role, empresaAtivaId ?? null),
    staleTime: 60_000,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (loadingEmpresa || loadingRole) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
        <div className="text-muted-foreground text-sm">Verificando permissões…</div>
      </div>
    );
  }
  if (!isAllowed) return <Navigate to="/" replace />;

  return <>{children}</>;
};
