import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleEntidadePreflight } from '../_shared/entidade-preflight-core.ts'

// DEPRECATED: alias fino de compatibilidade sobre `entidade-preflight` com
// papel:'COLABORADOR' fixo. Mantido só para não quebrar chamadores existentes que ainda
// mandam `{ cpf }` sem `papel` -- novos consumidores devem chamar `entidade-preflight`
// diretamente com `{ cpf, papel }`. Ver
// C:\Users\maxwe\.claude\plans\vamos-consolidar-a-rela-o-mellow-grove.md, Fase 2.
serve((req) => handleEntidadePreflight(req, 'COLABORADOR'))
