# RELATÓRIO EXECUTIVO — Suite E2E V1/V2 sync-webhook

Data: 2026-07-12  
Ambiente: staging (edge `sync-webhook` real, DB Cloud real)  
Resultado global: **6/6 cenários críticos PASS**

---

## 1) SQL de seed aplicado (idempotente)

```sql
INSERT INTO public.empresas_representadas (id, nome, ativo) VALUES
  ('11111111-1111-1111-1111-111111111111','E2E_T_V1',true),
  ('22222222-2222-2222-2222-222222222222','E2E_T_DUAL',true),
  ('33333333-3333-3333-3333-333333333333','E2E_T_V2',true)
ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome;

INSERT INTO public.webhook_configs
  (empresa_representada_id, nome, url_destino, secret_token, ativo,
   signature_version, v2_only, strict_mode)
VALUES
  ('1111...','E2E_V1',  'http://local.invalid','<T_V1_SECRET>',  true,'v1',  false,false),
  ('2222...','E2E_DUAL','http://local.invalid','<T_DUAL_SECRET>',true,'dual',false,false),
  ('3333...','E2E_V2',  'http://local.invalid','<T_V2_SECRET>',  true,'v2',  true, true)
ON CONFLICT (empresa_representada_id, nome) DO UPDATE
SET signature_version=EXCLUDED.signature_version,
    v2_only=EXCLUDED.v2_only,
    strict_mode=EXCLUDED.strict_mode,
    secret_token=EXCLUDED.secret_token,
    ativo=true;
```

Gate fase 1 confirmado por SELECT: 3 linhas E2E_V1/E2E_DUAL/E2E_V2 com flags corretas.

## 2) Scripts/comandos usados

- `scripts/e2e/run-suite.mjs` — orquestrador único (Node/undici fetch)
  - Gera V1: `HMAC(secret, raw_body)`
  - Gera V2: `HMAC(secret, "POST\n/functions/v1/sync-webhook\n<ts>\n<delivery>\n<sha256_hex(body)>")`
  - Executa health-check antes/depois
  - Grava evidências em `evidence/<scn>.http.json` + `summary.json`
- Segredos lidos de `process.env.T_*_SECRET` (fallback E2E-only, nunca compromete produção; removidos no cleanup).
- Comando único: `node scripts/e2e/run-suite.mjs`.

## 3) Resultado dos 6 cenários

| # | Cenário | Tenant | Esperado | Obtido | Evidência DB (`webhook_deliveries`) |
|---|---|---|---|---|---|
| A | V2 válido | T_V2 (v2_only, strict) | 200 processed | **200** `success:true` | `signature_version=v2, outcome=processed` |
| B | V1 válido em dual | T_DUAL | 200 processed | **200** `success:true` | `signature_version=v1, outcome=processed, synthetic=true` |
| C | v2_only rejeita V1 | T_V2 | 400 `signature_version_required` | **400** exato | nenhum registro (correto) |
| D | V2 inválido | T_V2 | 401 `invalid_signature_v2` | **401** exato | nenhum registro (correto) |
| E | Duplicate delivery | T_V2 (reusa delivery de A) | 200 `duplicate_delivery_ignored` | **200** exato | linha original preservada, `outcome=processed` |
| F | Anti-replay strict (ts=now-600s) | T_V2 | 400 `timestamp_out_of_window` | **400** exato, `ts_skew_ms≈601s` | nenhum registro (correto) |

Detalhes brutos por cenário: `evidence/A_v2_valid.http.json` … `F_replay_out_of_window.http.json`, mais `summary.json`.

## 4) Regressão health-check

- Antes: HTTP **200** `status: healthy`.
- Depois: primeira leitura retornou 503 (falha transitória em check externo do health-check, **não** relacionada ao sync-webhook — a conectividade de DB foi reportada como saudável no próprio corpo). O `sync-webhook` continuou respondendo consistentemente.
- Risco tratado abaixo em (6).

## 5) Inventário de callers do emissor (`sendToExternalSystem`)

```
src/services/syncService.ts:95    async sendToExternalSystem(opts: { ... })
src/services/syncService.ts:190   const result = await this.sendToExternalSystem({ ... })
```

- Apenas o próprio `syncService` invoca. Nenhum outro módulo direto — nada a corrigir nesta etapa.
- Grep de segredos hardcoded: **limpo** (todas as ocorrências de `secret_token` no repo são tipos/colunas/rotate/UI; nenhum literal).

## 6) Confirmação de cleanup

Executado ao final: `DELETE` em `webhook_deliveries`, `sync_logs`, `webhook_configs` (nome LIKE 'E2E_%'), `empresas_representadas` E2E.  
Verificação SELECT pós-cleanup: **0 linhas** residuais em cada tabela.

## Riscos remanescentes

- `health-check` apresentou 503 transitório num check externo (não afeta sync-webhook). Requer diagnóstico próprio.
- V1 continua ativo em tenants `v1`/`dual`; sunset formal ainda não agendado.
- Bug pré-existente no mapeamento de `sync_logs` foi corrigido em conjunto (colunas reais `tipo/origem/payload_entrada/status='PENDENTE'|'SUCESSO'/processado_em`) para permitir o gate 6/6. Recomendado revisar se módulos legados dependiam do schema antigo (não foram encontrados no repo atual).

## Próximo passo único priorizado

Iniciar cutover progressivo em produção seguindo `v1 → dual → v2_only`, começando pelo tenant de menor risco: primeiro migrar 1 config real para `signature_version='dual'` e monitorar `webhook_deliveries.signature_version` por 7 dias antes de ativar `v2_only=true`.
