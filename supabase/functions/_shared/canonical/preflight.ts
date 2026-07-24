// Porta 3 — Consulta/Autorização: formato PADRÃO de resposta para qualquer
// RPC de pré-checagem que um satélite chama ANTES de completar uma ação
// local (vender, reservar, matricular...). Diferente do envelope (Portas 1/2,
// que valida dados de ENTRADA), isto documenta o formato de SAÍDA de uma
// decisão do NOVUS.
//
// Duas instâncias reais deste padrão:
//   - `validar_saldo_estoque` (já implementada, migração P12 Estoque):
//     satélite pergunta se há saldo antes de vender.
//   - checagem de crédito/inadimplência (ainda não implementada — ver
//     docs/CONTRATOS_CANONICOS_ERP.md §6): satélite pergunta se pode vender
//     a prazo para um cliente com títulos vencidos.
//
// Novas checagens (reserva de horário, limite de vagas, etc.) devem seguir
// este mesmo formato em vez de inventar uma resposta ad-hoc por caso.

import { z } from 'https://esm.sh/zod@3.23.8';

export const bloqueioSchema = z.object({
  codigo: z.string().min(1),
  motivo: z.string().min(1),
  pode_ser_superado: z.boolean(),
  permissao_necessaria: z.string().optional().nullable(),
});

export const preflightResponseSchema = z.object({
  autorizado: z.boolean(),
  bloqueios: z.array(bloqueioSchema).default([]),
});

export type PreflightResponse = z.infer<typeof preflightResponseSchema>;
export type Bloqueio = z.infer<typeof bloqueioSchema>;

// Payload para registrar que um bloqueio superável foi superado por um
// usuário autorizado. O NOVUS deve validar `permissao_necessaria` do lado
// do servidor (has_role / permissão do perfil) — nunca confiar na alegação
// do satélite de que o usuário tem a permissão.
export const autorizacaoOverrideSchema = z.object({
  bloqueio_codigo: z.string().min(1),
  usuario_id: z.string().uuid(),
  justificativa: z.string().min(1, 'justificativa é obrigatória para superar um bloqueio'),
});

export type AutorizacaoOverride = z.infer<typeof autorizacaoOverrideSchema>;
