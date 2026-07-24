// Envelope de rastreabilidade multi-origem (hub <- satélites).
//
// Formaliza um padrão que já existia de forma parcial e ad-hoc no fluxo
// Venda -> ContaReceber (migração 20260711120808, sprint "FIN-E5"): todo
// registro que pode ter sido originado por um sistema externo (PDV, sistema
// escolar, etc.) carrega estes campos, permitindo rastrear a origem,
// deduplicar reentregas e detectar conflitos de payload.
//
// Ver docs/CONTRATOS_CANONICOS_ERP.md para o contrato completo.

import { z } from 'https://esm.sh/zod@3.23.8';

export const origemEnvelopeSchema = z.object({
  origem_sistema: z.string().min(1).optional().nullable(),
  origem_canal: z.string().min(1).optional().nullable(),
  externo_id: z.string().min(1).optional().nullable(),
  idempotency_key: z.string().min(1).optional().nullable(),
  hash_payload: z.string().min(1).optional().nullable(),
});

export type OrigemEnvelope = z.infer<typeof origemEnvelopeSchema>;

// Anexa o envelope de origem a qualquer schema de entidade canônica,
// tornando os campos de rastreabilidade opcionais (registros criados
// diretamente na UI do NOVUS não têm sistema de origem) mas com o
// formato validado quando presentes.
export function withOrigemEnvelope<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).merge(origemEnvelopeSchema);
}
