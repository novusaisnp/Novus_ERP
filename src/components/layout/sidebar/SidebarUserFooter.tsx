
import React from 'react';
import { ChevronUp, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarUserFooterProps {
  isHovered: boolean;
}

export const SidebarUserFooter: React.FC<SidebarUserFooterProps> = ({
  isHovered,
}) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    console.log('[Sidebar] Fazendo logout');
    await signOut();
    navigate('/login');
  };

  const userName = user?.user_metadata?.nome_completo || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border bg-sidebar-accent" style={{ height: '60px' }}>
      <div className="h-full p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-full flex items-center text-sidebar-foreground hover:bg-sidebar-primary/20 transition-colors p-2 rounded h-full ${
                isHovered ? 'justify-start' : 'justify-center'
              }`}
              title={!isHovered ? `${userName} - Ver perfil` : undefined}
            >
              <div className="flex items-center justify-center w-8 h-8 bg-sidebar-primary rounded-lg flex-shrink-0">
                <User className="h-4 w-4" />
              </div>
              {isHovered && (
                <>
                  <div className="ml-3 text-left flex-1 min-w-0 overflow-hidden">
                    <div className="text-sm font-medium text-sidebar-foreground whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '160px' }}>
                      {userName}
                    </div>
                    <div className="text-xs text-sidebar-foreground/70 whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '160px' }}>
                      {userEmail}
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4 flex-shrink-0 ml-2" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 mb-2"
            side="right"
            align="end"
            sideOffset={8}
          >
            <DropdownMenuItem onClick={() => navigate("/configuracoes/sistema")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <User className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
