# Ativação do Provedor Fiscal Real (Focus NFe)

> Guia passo-a-passo para sair do modo mock (`FISCAL_MOCK=true`) e ativar a
> comunicação real com o provedor fiscal em ambiente de homologação.

## 1. Pré-requisitos

- Conta ativa na **Focus NFe** (ou provedor equivalente) com CNPJ de homologação já provisionado.
- Certificado A1 (.pfx) da empresa emissora já carregado via tela **Fiscal → Certificados** (Fase 1).
- Empresa representada com regime tributário, CNAE, endereço completo e IE preenchidos.
- Acesso admin ao painel do provedor para configurar webhooks.

## 2. Cadastrar secrets no backend

No painel de secrets da Lovable Cloud (Backend → Secrets), adicione:

| Nome | Descrição |
| --- | --- |
| `FISCAL_PROVIDER_API_KEY_HOM` | Token da API Focus NFe (ambiente de homologação). |
| `FISCAL_WEBHOOK_SECRET` | Gere um valor aleatório com `openssl rand -hex 32`. Este mesmo valor será colado no painel Focus. |
| `FISCAL_PROVIDER_BASE_URL` | Opcional. Default: `https://homologacao.focusnfe.com.br`. |

> Nenhuma alteração de código é necessária — as edge functions leem essas variáveis em runtime.

## 3. Desligar o modo mock

Também nos secrets, defina:

```
FISCAL_MOCK=false
```

Não remova o secret: mantê-lo explícito facilita rollback.

## 4. Registrar o webhook no painel Focus NFe

1. Acesse **Focus NFe → Configurações → Webhooks**.
2. Cadastre a URL:
   ```
   https://<project-ref>.functions.supabase.co/fiscal-webhook
   ```
3. Cole em "Secret" o mesmo valor de `FISCAL_WEBHOOK_SECRET`.
4. Marque os eventos: `autorizado`, `cancelado`, `rejeitado`, `denegado`, `cce_registrada`.
5. Salve e dispare o "Testar webhook" — deve responder 200.

## 5. Smoke test de ativação real

Após 5 a 10 minutos (propagação do secret):

1. Abra uma venda faturada em ambiente de homologação (dados sintéticos).
2. Clique **Emitir NF-e** → confirme.
3. Aguarde badge mudar para **autorizada** em até 2 min.
4. Abra o drawer → verifique XML e DANFE (URLs reais, não mais `mock://`).
5. Execute CC-e com correção de teste → confirme evento na timeline.
6. Execute cancelamento → status deve virar `cancelada`.

## 6. Rollback

Se o comportamento real estiver instável:

1. Voltar `FISCAL_MOCK=true` nos secrets.
2. Comunicar usuários no canal `#erp-fiscal`.
3. Abrir issue com:
   - `documento_id` afetado
   - Logs estruturados das edge functions (`supabase functions logs`)
   - Resposta do provedor (payload_provedor da tabela)

## 7. Troubleshooting

| Erro | Causa provável | Ação |
| --- | --- | --- |
| `401` do provedor | Token expirado/incorreto | Rotacionar `FISCAL_PROVIDER_API_KEY_HOM`. |
| `422` (validação) | Payload incompleto | Revisar mapper `vendaToNFePayload` + dados da venda. |
| Timeout | Provedor lento | Retry automático já cobre; se persistir, escalar. |
| Certificado expirado | Alerta `fiscal_certificado_expira` disparado | Reupload via **Fiscal → Certificados**. |
| Webhook 401 | HMAC inválido | Conferir se o secret cadastrado no painel Focus é idêntico ao da Lovable Cloud. |

## 8. Escalonamento

- **Time interno:** `#erp-fiscal` (Slack).
- **Provedor:** suporte Focus NFe — SLA 4h em horário comercial.
