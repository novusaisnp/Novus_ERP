
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserDropdown } from '@/components/layout/header/UserDropdown';
import { useEmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';

export const AppHeader: React.FC = () => {
  const { empresa } = useEmpresaResponsavel();

  const formatarCnpj = (cnpj: string) => {
    if (!cnpj) return '';
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4">
      <div className="flex-1 flex items-center gap-3">
        <span className="text-xl font-semibold text-primary">ERP</span>
        <img 
          src="/lovable-uploads/2b20e13a-06d5-4b20-8072-9b4f413ad5f2.png" 
          alt="Logo ERP" 
          className="h-8 w-auto"
        />
      </div>

      {/* Dados da Empresa Responsável - Centralizados */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {empresa ? (
          <>
            <div className="text-sm font-medium text-foreground">
              {empresa.nome}
            </div>
            <div className="text-xs text-muted-foreground">
              CNPJ: {formatarCnpj(empresa.cnpj || '')}
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            Carregando dados da empresa...
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
