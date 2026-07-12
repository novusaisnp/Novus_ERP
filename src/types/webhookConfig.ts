import { z } from 'zod';

export const WEBHOOK_EVENTOS = [
  'cliente.created',
  'cliente.updated',
  'cliente.deleted',
  'venda.created',
  'venda.updated',
  'contrato.created',
  'contrato.updated',
  'financeiro.created',
  'financeiro.updated',
] as const;

export type WebhookEvento = (typeof WEBHOOK_EVENTOS)[number];

export interface WebhookConfig {
  id: string;
  empresa_representada_id: string;
  nome: string;
  descricao: string | null;
  url_destino: string;
  metodo: string;
  secret_token: string | null;
  eventos: WebhookEvento[];
  headers: Record<string, string> | null;
  max_tentativas: number;
  timeout_segundos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const WebhookConfigInputSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  descricao: z.string().trim().max(500).optional().nullable(),
  url_destino: z
    .string()
    .trim()
    .url('URL inválida')
    .max(500)
    .refine((v) => v.startsWith('https://'), 'URL deve usar HTTPS'),
  metodo: z.enum(['POST', 'PUT']).default('POST'),
  secret_token: z.string().min(8).max(255).optional().nullable(),
  eventos: z
    .array(z.enum(WEBHOOK_EVENTOS))
    .min(1, 'Selecione ao menos 1 evento'),
  max_tentativas: z.number().int().min(1).max(20).default(5),
  timeout_segundos: z.number().int().min(1).max(120).default(10),
  ativo: z.boolean().default(true),
  empresa_representada_id: z.string().uuid('empresa_representada_id obrigatório'),
});

export type WebhookConfigInput = z.infer<typeof WebhookConfigInputSchema>;

export function generateSecretToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
