import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleEntidadePreflight } from '../_shared/entidade-preflight-core.ts'

// Porta 3 genérica — substitui `colaborador-preflight` (agora um alias fino de
// compatibilidade). Payload: `{ cpf, papel }`, `papel` obrigatório e precisa ser um
// código válido de `papeis_catalogo` -- o satélite declara explicitamente, o ERP nunca
// infere. Ver CONTRATOS_CANONICOS_ERP.md §6/§7 e
// C:\Users\maxwe\.claude\plans\vamos-consolidar-a-rela-o-mellow-grove.md, Fase 2.
serve((req) => handleEntidadePreflight(req))
