
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarMenuItem } from './sidebar/SidebarMenuItem';
import { SidebarMenuGroup } from './sidebar/SidebarMenuGroup';
import { sidebarItems } from './sidebar/sidebarConfig';
import { useAuth } from '@/contexts/AuthContext';

console.log('[Sidebar] Inicializando AppSidebar com padrão das imagens 2 e 3');

interface AppSidebarProps {
  onExpandedChange?: (expanded: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function AppSidebar({
  onExpandedChange,
  mobileOpen = false,
  onMobileOpenChange
}: AppSidebarProps) {
  console.log('[Sidebar] Renderizando AppSidebar');
  const navigate = useNavigate();
  const {
    setOpenMobile
  } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { user } = useAuth();

  // Sidebar sempre exibe todos os itens — sem gates de feature flag
  const visibleItems = sidebarItems;

  useEffect(() => {
    console.log('[Sidebar] Estado hover alterado:', isHovered);
    onExpandedChange?.(isHovered);
  }, [isHovered, onExpandedChange]);

  const handleNavigation = (url: string) => {
    console.log('[Sidebar] Navegando para:', url);
    navigate(url);
    setOpenMobile(false);
    onMobileOpenChange?.(false);
  };

  const handleMouseEnter = () => {
    console.log('[Sidebar] Mouse entrou - expandindo');
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    console.log('[Sidebar] Mouse saiu - recolhendo');
    setIsHovered(false);
  };

  const handleGroupToggle = (groupTitle: string) => {
    console.log('[Sidebar] Toggle do grupo:', groupTitle);
    if (openGroup === groupTitle) {
      setOpenGroup(null);
      console.log('[Sidebar] Grupo fechado:', groupTitle);
    } else {
      setOpenGroup(groupTitle);
      console.log('[Sidebar] Grupo aberto:', groupTitle);
    }
  };

  const isMobile = useIsMobile();

  // Conteúdo de navegação compartilhado entre a variante mobile (Sheet) e a
  // rail fixa de desktop — mesmos itens, mesmos componentes, só muda o
  // container visual em volta. `expanded` controla ícone+rótulo vs só ícone.
  const renderNavItems = (expanded: boolean) => (
    visibleItems.map(item => (
      <div key={item.title} className="mb-1">
        {item.items ? (
          <SidebarMenuGroup
            item={item}
            isHovered={expanded}
            isOpen={openGroup === item.title}
            onToggle={() => handleGroupToggle(item.title)}
            onNavigate={handleNavigation}
          />
        ) : (
          <SidebarMenuItem
            title={item.title}
            url={item.url!}
            icon={item.icon}
            isHovered={expanded}
            onClick={handleNavigation}
          />
        )}
      </div>
    ))
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-3/4 sm:max-w-xs bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="px-4 py-3 border-b border-sidebar-border">
            <SheetTitle className="text-sidebar-foreground">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {renderNavItems(true)}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={`fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-in-out bg-sidebar border-r border-sidebar-border ${
        isHovered ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-full flex flex-col text-sidebar-foreground">
        {/* Menu Items - Ocupam toda a altura disponível */}
        <div className="flex-1 overflow-y-auto py-[63px]">
          {renderNavItems(isHovered)}
        </div>
      </div>
    </div>
  );
}
