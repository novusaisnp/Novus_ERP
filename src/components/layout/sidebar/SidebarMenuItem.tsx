
import React from 'react';
import { useLocation } from 'react-router-dom';

interface SidebarMenuItemProps {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  isHovered: boolean;
  onClick: (url: string) => void;
}

export const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  title,
  url,
  icon: Icon,
  isHovered,
  onClick,
}) => {
  const location = useLocation();
  const isActive = location.pathname === url;

  return (
    <button
      onClick={() => onClick(url)}
      className={`relative w-full flex items-center px-4 py-3 text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
        isHovered ? 'justify-start' : 'justify-center'
      } ${
        isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : ''
      }`}
      title={!isHovered ? title : undefined}
    >
      {isActive && (
        <span className="absolute left-0 top-0 h-full w-[3px] bg-[hsl(var(--accent-vivid))]" />
      )}
      {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
      {isHovered && (
        <span className="ml-3 text-sm font-medium">{title}</span>
      )}
    </button>
  );
};
