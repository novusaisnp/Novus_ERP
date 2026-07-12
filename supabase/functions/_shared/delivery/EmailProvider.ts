import type { DeliveryPayload, DeliveryProvider, DeliveryResult } from "./DeliveryProvider.ts";
import { getTemplate } from "../transactional-email-templates/registry.ts";

// EmailProvider — STUB dormente. Contrato completo já implementado.
// Ativação real só quando:
//   1) domínio transacional validado (SENDER_DOMAIN + FROM_DOMAIN)
//   2) flag DELIVERY_PROVIDER=email definida
// Enquanto dormente, retorna failed controlado com reason estável.

export interface EmailProviderOptions {
  senderDomain?: string | null;
  fromDomain?: string | null;
  templateName?: string;
}

export class EmailProvider implements DeliveryProvider {
  readonly name = "email";
  private readonly senderDomain: string | null;
  private readonly fromDomain: string | null;
  private readonly templateName: string;

  constructor(opts: EmailProviderOptions = {}) {
    this.senderDomain = opts.senderDomain ?? null;
    this.fromDomain = opts.fromDomain ?? null;
    this.templateName = opts.templateName ?? "report-scheduled-delivery";
  }

  send(payload: DeliveryPayload): Promise<DeliveryResult> {
    // Validação básica de payload.
    if (!payload.recipients || payload.recipients.length === 0) {
      return Promise.resolve({
        status: "failed",
        messageId: null,
        reason: "no_recipients",
      });
    }
    if (!this.senderDomain || !this.fromDomain) {
      return Promise.resolve({
        status: "failed",
        messageId: null,
        reason: "email_domain_not_configured",
      });
    }
    if (!getTemplate(this.templateName)) {
      return Promise.resolve({
        status: "failed",
        messageId: null,
        reason: `template_not_found:${this.templateName}`,
      });
    }

    // Dormente. Não envia. Nenhuma chamada externa aqui.
    return Promise.resolve({
      status: "failed",
      messageId: null,
      reason: "email_provider_not_activated",
    });
  }
}
