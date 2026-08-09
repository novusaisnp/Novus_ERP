import { useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Insight, InsightActionPayload, InsightSeverity } from '@/utils/reportInsights';

interface InsightsBannerProps {
  insights: Insight[];
  onAction?: (payload: InsightActionPayload) => void;
}

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { icon: typeof Info; wrap: string; iconClass: string }
> = {
  critical: {
    icon: ShieldAlert,
    wrap: 'border-destructive/50 bg-destructive/5',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    wrap: 'border-status-production/50 bg-status-production/5',
    iconClass: 'text-status-production',
  },
  info: {
    icon: Info,
    wrap: 'border-primary/50 bg-primary/5',
    iconClass: 'text-primary',
  },
};

export function InsightsBanner({ insights, onAction }: InsightsBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  if (insights.length === 0) return null;

  const visible = expanded ? insights : insights.slice(0, 3);
  const hasMore = insights.length > 3;

  const handleClick = (i: Insight) => {
    if (!i.action || !onAction) return;
    onAction(i.action.payload);
    setFeedback(`Filtro aplicado: ${i.action.label}`);
    window.setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="space-y-2">
      <div aria-live="polite" className="sr-only">
        {feedback}
      </div>
      <div className="space-y-2">
        {visible.map((i) => {
          const s = SEVERITY_STYLES[i.severity];
          const Icon = s.icon;
          return (
            <Card key={i.id} className={cn('border', s.wrap)}>
              <CardContent className="p-3 flex items-start gap-3">
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', s.iconClass)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{i.description}</p>
                </div>
                {i.action && (
                  <Button size="sm" variant="outline" onClick={() => handleClick(i)}>
                    {i.action.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {hasMore && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded((e) => !e)}
          className="gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Ver todos ({insights.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
