
import React from 'react';
import { ChevronDown, Settings, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

export const UserDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    console.log('[UserDropdown] Fazendo logout');
    await signOut();
    navigate('/login');
  };

  // Extrair primeiro nome do nome completo ou usar a primeira parte do email
  const getFirstName = (fullName: string | null, email: string | null) => {
    if (fullName) {
      return fullName.split(' ')[0];
    }
    if (email) {
      return email.split('@')[0];
    }
    return 'Usuário';
  };

  const userName = user?.user_metadata?.nome_completo || null;
  const userEmail = user?.email || '';
  const firstName = getFirstName(userName, userEmail);
  const userInitials = firstName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start min-w-0 hidden sm:flex">
            <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
              {firstName}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
              {userEmail}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuItem onClick={() => navigate("/configuracoes/sistema")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
