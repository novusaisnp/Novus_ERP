
import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserDropdown } from '@/components/layout/header/UserDropdown';
import { useEmpresaRepresentadaAtual } from '@/hooks/useEmpresaRepresentadaAtual';
import { useEmpresaLogoUrl } from '@/hooks/useEmpresaLogoUrl';
import { useAuth } from '@/contexts/AuthContext';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onMenuClick }) => {
  const { data: empresa, isLoading: loading } = useEmpresaRepresentadaAtual();
  const { user } = useAuth();
  const logoPath = (empresa?.configuracoes as Record<string, string> | null)?.logo_path;
  const { data: logoUrl } = useEmpresaLogoUrl(empresa?.id, logoPath);

  const formatarCnpj = (cnpj: string) => {
    if (!cnpj) return '';
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-xl font-semibold text-primary">ERP</span>
        <img
          src="/novus-logo.png"
          alt="Logo ERP"
          className="h-8 w-auto"
        />
      </div>

      {/* Logo/dados da empresa representada ativa (loja/CNPJ atual) - Centralizados, escondido em telas estreitas pra caber o menu+ações */}
      <div className="hidden sm:flex flex-1 flex-col items-center justify-center">
        {logoUrl ? (
          <div className="bg-white rounded-md px-3 py-1.5">
            <img
              src={logoUrl}
              alt={empresa?.nome || 'Logo da empresa'}
              className="h-12 max-w-[280px] object-contain"
            />
          </div>
        ) : empresa?.nome ? (
          <>
            <div className="text-sm font-medium text-foreground">
              {empresa.nome}
            </div>
            {empresa.cnpj && (
              <div className="text-xs text-muted-foreground">
                CNPJ: {formatarCnpj(empresa.cnpj)}
              </div>
            )}
          </>
        ) : loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : (
          <div className="text-sm font-medium text-foreground">
            {user?.email || 'NOVUS ERP'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <UserDropdown />
      </div>
    </header>
  );
};
