import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

// Roda depois do ProtectedRoute (já autenticado) — cuida só de "sabe pra qual empresa
// representada está olhando?". Usuários com empresa fixa (a maioria) resolvem na hora,
// sem passar pela tela de seleção; quem não tem (ex. novus_owner) é mandado pra lá.
export const EmpresaGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'checking' | 'resolved' | 'unresolved'>('checking');
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    setStatus('checking');
    getEmpresaAtivaId().then((id) => {
      if (cancelled) return;
      setStatus(id ? 'resolved' : 'unresolved');
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === 'unresolved') {
    return <Navigate to="/selecionar-empresa" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
