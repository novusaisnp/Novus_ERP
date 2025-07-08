
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
          className={`w-full flex items-center px-4 py-3 text-white hover:bg-blue-700 transition-colors ${
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
          <div className="ml-8 border-l border-blue-600">
            {item.items?.map((subItem) => (
              <button
                key={subItem.title}
                onClick={() => onNavigate(subItem.url)}
                className={`w-full text-left px-4 py-2 text-sm text-blue-100 hover:bg-blue-700 hover:text-white transition-colors block ${
                  location.pathname === subItem.url ? 'bg-blue-600 text-white font-medium' : ''
                }`}
              >
                {subItem.title}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};
