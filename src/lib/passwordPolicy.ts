import { z } from 'zod';

// Mínimo 12 caracteres (NIST 800-63B prioriza comprimento sobre regra de composição
// forçada), pelo menos 1 letra, 1 número e 1 caractere especial — mesma regra usada no
// painel de criação de senha do login (usuário novo entra com o e-mail como senha
// temporária, troca aqui) e no reset por admin.
export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter no mínimo 12 caracteres, incluindo letra, número e caractere especial.';

export const passwordSchema = z
  .string()
  .min(12, PASSWORD_POLICY_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_POLICY_MESSAGE)
  .regex(/\d/, PASSWORD_POLICY_MESSAGE)
  .regex(/[^A-Za-z0-9]/, PASSWORD_POLICY_MESSAGE);
