
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarMenuItem } from './sidebar/SidebarMenuItem';
import { SidebarMenuGroup } from './sidebar/SidebarMenuGroup';
import { sidebarItems } from './sidebar/sidebarConfig';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

console.log('[Sidebar] Inicializando AppSidebar com padrão das imagens 2 e 3');

interface AppSidebarProps {
  onExpandedChange?: (expanded: boolean) => void;
}

export function AppSidebar({
  onExpandedChange
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

  return (
    <div 
      className={`fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64' : 'w-16'
      }`} 
      style={{
        backgroundColor: '#1e3a8a',
        borderRight: '1px solid #3b82f6'
      }} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-full flex flex-col text-white">
        {/* Menu Items - Ocupam toda a altura disponível */}
        <div className="flex-1 overflow-y-auto py-[63px]">
          {visibleItems.map(item => (
            <div key={item.title} className="mb-1">
              {item.items ? (
                <SidebarMenuGroup 
                  item={item} 
                  isHovered={isHovered} 
                  isOpen={openGroup === item.title} 
                  onToggle={() => handleGroupToggle(item.title)} 
                  onNavigate={handleNavigation} 
                />
              ) : (
                <SidebarMenuItem 
                  title={item.title} 
                  url={item.url!} 
                  icon={item.icon} 
                  isHovered={isHovered} 
                  onClick={handleNavigation} 
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
