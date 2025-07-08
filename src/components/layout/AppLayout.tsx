
import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { BrandFooter } from '@/components/layout/BrandFooter';
import { useState } from 'react';

console.log('[Layout] Inicializando AppLayout com suporte a temas');

export const AppLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const handleSidebarExpandedChange = (expanded: boolean) => {
    console.log('[Sidebar] Sidebar expandida:', expanded);
    setSidebarExpanded(expanded);
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-muted/20 transition-colors duration-300">
        <AppSidebar onExpandedChange={handleSidebarExpandedChange} />
        <div 
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            sidebarExpanded ? 'ml-64' : 'ml-16'
          }`}
          style={{ minHeight: '100vh' }}
        >
          <AppHeader />
          <main className="flex-1 overflow-auto bg-background/50 transition-colors duration-300" style={{ paddingBottom: '80px' }}>
            <div className="pb-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <BrandFooter />
    </SidebarProvider>
  );
};
