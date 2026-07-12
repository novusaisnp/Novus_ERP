// Resolver do provider ativo. Default = noop.
// Email só ativa com flag explícita + domínio configurado.

import type { DeliveryProvider } from "./DeliveryProvider.ts";
import { NoopProvider } from "./NoopProvider.ts";
import { EmailProvider } from "./EmailProvider.ts";

export interface ResolveProviderEnv {
  DELIVERY_PROVIDER?: string | null;
  SENDER_DOMAIN?: string | null;
  FROM_DOMAIN?: string | null;
}

export function resolveDeliveryProvider(env: ResolveProviderEnv): DeliveryProvider {
  const kind = (env.DELIVERY_PROVIDER ?? "noop").toLowerCase();
  if (kind === "email" && env.SENDER_DOMAIN && env.FROM_DOMAIN) {
    return new EmailProvider({ senderDomain: env.SENDER_DOMAIN, fromDomain: env.FROM_DOMAIN });
  }
  return new NoopProvider();
}
