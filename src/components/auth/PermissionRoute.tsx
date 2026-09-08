// PERM-1: gate de rota por permissão granular, mesmo modelo do AdminRoute
// (que resolve papel). Aqui a checagem é `public.pode(codigo)`.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissao } from '@/hooks/usePermissao';

interface Props {
  codigo: string;
  children: React.ReactNode;
}

export const PermissionRoute: React.FC<Props> = ({ codigo, children }) => {
  const { user } = useAuth();
  const { permitido, isLoading } = usePermissao(codigo);

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
        <div className="text-muted-foreground text-sm">Verificando permissões…</div>
      </div>
    );
  }
  if (!permitido) return <Navigate to="/" replace />;

  return <>{children}</>;
};
