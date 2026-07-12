import type { DeliveryPayload, DeliveryProvider, DeliveryResult } from "./DeliveryProvider.ts";

// EmailProvider — STUB dormente. NÃO usado em P4.2A. Ativado apenas em P4.2C, D+0,
// quando o domínio transacional estiver validado. Manter contratos estáveis.
export class EmailProvider implements DeliveryProvider {
  readonly name = "email";

  send(_payload: DeliveryPayload): Promise<DeliveryResult> {
    return Promise.resolve({
      status: "failed",
      messageId: null,
      reason: "email_provider_not_activated",
    });
  }
}
