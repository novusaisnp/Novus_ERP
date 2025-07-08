
import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNodeProps {
  id: string;
  label: React.ReactNode;
  children?: React.ReactNode;
  isExpanded?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  level?: number;
  actions?: React.ReactNode;
  className?: string;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  id,
  label,
  children,
  isExpanded = false,
  hasChildren = false,
  onToggle,
  level = 0,
  actions,
  className,
}) => {
  const paddingLeft = level * 24;

  return (
    <div className={cn("tree-node", className)}>
      <div 
        className="flex items-center py-2 px-3 hover:bg-muted/50 rounded-md cursor-pointer group"
        style={{ paddingLeft: `${paddingLeft + 12}px` }}
      >
        <div className="flex items-center flex-1 min-w-0" onClick={onToggle}>
          {hasChildren ? (
            <button className="mr-2 p-1 hover:bg-muted rounded flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6 mr-2 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {label}
          </div>
        </div>
        {actions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      {isExpanded && children && (
        <div className="tree-children">
          {children}
        </div>
      )}
    </div>
  );
};

interface TreeViewProps {
  children: React.ReactNode;
  className?: string;
}

export const TreeView: React.FC<TreeViewProps> = ({ children, className }) => {
  return (
    <div className={cn("tree-view space-y-1", className)}>
      {children}
    </div>
  );
};
