
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
      className={`w-full flex items-center px-4 py-3 text-white hover:bg-blue-700 transition-colors ${
        isHovered ? 'justify-start' : 'justify-center'
      } ${
        isActive ? 'bg-blue-600 font-medium' : ''
      }`}
      title={!isHovered ? title : undefined}
    >
      {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
      {isHovered && (
        <span className="ml-3 text-sm font-medium">{title}</span>
      )}
    </button>
  );
};
