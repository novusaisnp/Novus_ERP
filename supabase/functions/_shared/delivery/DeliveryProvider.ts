// DeliveryProvider — contrato comum para entrega de artefatos gerados pelos schedules.
// P4.2A: apenas NoopProvider é ativo. EmailProvider fica dormente até domínio disponível.

export type DeliveryStatus = "sent" | "skipped" | "failed";

export interface DeliveryPayload {
  runId: string;
  scheduleId: string;
  userId: string;
  scope: "vendas" | "financeiro";
  format: "csv" | "xlsx" | "pdf";
  signedUrl: string;
  recipients: string[];
  scheduleName: string;
  generatedAt: string;
}

export interface DeliveryResult {
  status: DeliveryStatus;
  messageId: string | null;
  reason: string | null;
}

export interface DeliveryProvider {
  readonly name: string;
  send(payload: DeliveryPayload): Promise<DeliveryResult>;
}
