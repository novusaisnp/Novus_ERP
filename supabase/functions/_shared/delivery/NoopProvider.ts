import type { DeliveryPayload, DeliveryProvider, DeliveryResult } from "./DeliveryProvider.ts";

// NoopProvider — não envia nada. Marca a entrega como "skipped" e retorna sem erro.
// Ativo enquanto o domínio de e-mail estiver ausente (P4.2A).
export class NoopProvider implements DeliveryProvider {
  readonly name = "noop";

  send(_payload: DeliveryPayload): Promise<DeliveryResult> {
    return Promise.resolve({
      status: "skipped",
      messageId: null,
      reason: "email_domain_unavailable",
    });
  }
}
