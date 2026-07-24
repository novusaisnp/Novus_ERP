// SM1-D: gate admin-only para rotas restritas (ex.: SyncDashboard).
// Depende de auth já resolvido via ProtectedRoute (não substitui). Faz uma
// consulta leve a user_roles usando a sessão atual.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { checkHasRole } from '@/utils/authUtils';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['is-admin', user?.id ?? null],
    enabled: !!user?.id,
    queryFn: () => checkHasRole(user!.id, 'admin'),
    staleTime: 60_000,
  });

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
        <div className="text-muted-foreground text-sm">Verificando permissões…</div>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
