
import React from 'react';

export const BrandFooter: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t border-border">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Uma solução</span>
          <img
            src="/novus-logo-footer.png"
            alt="NOVUS.AI"
            className="h-6 w-auto"
          />
        </div>
      </div>
    </div>
  );
};
