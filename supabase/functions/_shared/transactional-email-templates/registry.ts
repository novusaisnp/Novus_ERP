// Registry de templates transacionais.
// P4.2C: registrado como dormente. Ativação real só com domínio validado + EmailProvider habilitado.

export type TemplateComponent = (props: Record<string, unknown>) => unknown;

export interface TemplateEntry {
  component: TemplateComponent;
  subject: string;
  displayName?: string;
  previewData?: Record<string, unknown>;
}

import { template as reportScheduledDelivery } from "./report-scheduled-delivery.tsx";

export const TEMPLATES: Record<string, TemplateEntry> = {
  "report-scheduled-delivery": reportScheduledDelivery,
};

export function getTemplate(name: string): TemplateEntry | null {
  return TEMPLATES[name] ?? null;
}
