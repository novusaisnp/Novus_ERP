
import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MenuItem } from './sidebarConfig';

interface SidebarMenuGroupProps {
  item: MenuItem;
  isHovered: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (url: string) => void;
}

export const SidebarMenuGroup: React.FC<SidebarMenuGroupProps> = ({
  item,
  isHovered,
  isOpen,
  onToggle,
  onNavigate,
}) => {
  const location = useLocation();

  return (
    <Collapsible 
      open={isOpen}
      onOpenChange={onToggle}
    >
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
            isHovered ? 'justify-start' : 'justify-center'
          }`}
          title={!isHovered ? item.title : undefined}
        >
          {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
          {isHovered && (
            <>
              <span className="ml-3 text-sm font-medium">{item.title}</span>
              <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${
                isOpen ? 'rotate-90' : ''
              }`} />
            </>
          )}
        </button>
      </CollapsibleTrigger>
      {isHovered && (
        <CollapsibleContent className="transition-all duration-300">
          <div className="ml-8 border-l border-sidebar-border">
            {item.items?.map((subItem) => {
              const isSubActive = location.pathname === subItem.url;
              return (
                <button
                  key={subItem.title}
                  onClick={() => onNavigate(subItem.url)}
                  className={`relative w-full text-left px-4 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors block ${
                    isSubActive ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : ''
                  }`}
                >
                  {isSubActive && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-[hsl(var(--accent-vivid))]" />
                  )}
                  {subItem.title}
                </button>
              );
            })}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};
