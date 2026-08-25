# Diagnóstico Fiscal Corrigido — evidências reais (2026-07-14)

> Documento escrito após reclamação legítima do usuário: o relatório anterior
> apresentou "Dashboard Fiscal roteado" e "módulo no teto de prontidão em
> mock", mas a UI real ainda mostra **"Funcionalidade em desenvolvimento"** em
> várias abas fiscais. Este documento reconstitui o que está de fato
> funcional na UI vs no repositório.

## 1. Verificação visual da UI (fonte da confusão)

Grep direto no código, `rg -n "Funcionalidade em desenvolvimento" src/`:

| Arquivo | Linha | Aba |
| --- | --- | --- |
| `src/pages/fiscal/NotasFiscais.tsx` | 188 | **Emitir** |
| `src/pages/fiscal/NotasFiscais.tsx` | 208 | **Consultar** |
| `src/pages/fiscal/NotasFiscais.tsx` | 228 | **Relatórios Fiscais** |
| `src/pages/fiscal/SPED.tsx` | 196, 219, 242 | Gerar/Histórico/Config |

Em `/fiscal/notas-fiscais`:
- A aba **Dashboard** exibe cards mockados com valores hard-coded (`1.234`, `R$ 125.430`) — **não** consulta `fiscal_documentos_eletronicos`.
- As abas **Emitir**, **Consultar** e **Relatórios** exibem literal *"Funcionalidade em desenvolvimento"*.
- O botão *"Nova Nota Fiscal"* no header é decorativo (`<Button>` sem `onClick`).

Em `/fiscal/dashboard` (rota criada agora):
- Existe no código (`DashboardFiscal.tsx`), foi roteada em `App.tsx`, e agora tem card de smoke + alertas ativos.
- Mas **está protegida por `AdminRoute`** e o item no sidebar só aparece para admin. Se o usuário logado não tem `role='admin'` em `user_roles`, a página fica inacessível e/ou redireciona.
- KPIs consomem `fiscal_metrics_daily`, que depende de documentos existirem — como o banco está vazio, tudo mostra zero.

Em `/vendas`:
- `FiscalStatusBadge` e menu *"Emitir NF-e"* estão wireados em `VendaFormModal`/tabela de vendas (código presente).
- Mas o menu só aparece quando a venda está em status `faturada` (verificar `set-venda-status` fixture). Se o usuário não tem uma venda faturada, nada aparece — sem erro na UI.

**Conclusão da UI:** o "Dashboard Fiscal" existe mas fica em uma rota separada (`/fiscal/dashboard`), enquanto o item do menu que o usuário efetivamente vê e clica é *"Notas Fiscais"* → página **stub**. Meu relatório anterior descreveu o `DashboardFiscal` como se fosse o rosto do módulo, quando na prática é uma rota auxiliar.

## 2. Configuração de ambiente

`fetch_secrets` (turno anterior, ainda vale):

- `FISCAL_MOCK` — **ausente** → código default `true` (mock).
- `FISCAL_PROVIDER_API_KEY_HOM` — ausente.
- `FISCAL_WEBHOOK_SECRET` — ausente.
- `FISCAL_PROVIDER_BASE_URL` — ausente.

Nada aqui bloqueia UI; apenas confirma que qualquer emissão real seria impossível.

## 3. Edge functions

Deploy do turno anterior confirmou entrega de `fiscal-smoke-run` e `evaluate-ops-alerts`. Consulta atual aos logs mostra apenas atividade rotineira de `run-report-schedules` (cron `*/1`). **Nenhuma invocação de `fiscal-smoke-run` foi registrada** — o botão nunca foi clicado, e o script `smoke-mock.mjs` nunca foi executado nesta sessão.

`evaluate-ops-alerts` recebeu 4 probes fiscais novos no código, mas o cron dessa função **não está agendado** neste projeto (não encontrei registro em `pg_cron` de invocação `evaluate-ops-alerts`). Ou seja: as 4 regras existem no código mas ninguém as executa.

## 4. Banco de dados

Query real neste turno:

```
fiscal_documentos_eletronicos: 0 linhas
fiscal_eventos:                0 linhas
report_ops_alerts (fiscal_*):  4 linhas — as seeds da migration, todas resolved_at=NULL
```

As 4 linhas fiscais em `report_ops_alerts` são as **seeds da Fase 4** (inseridas por migration anterior), não fruto do avaliador. Como o avaliador não roda, o motor real das 4 regras nunca disparou.

## 5. CI

Arquivo `.github/workflows/fiscal.yml` foi criado neste repositório no turno anterior, mas **eu não tenho como saber se o GitHub Actions o executou** — o build/preview do Lovable roda no sandbox, não no runner do GitHub. "Passar no CI" só será verificável quando houver PR aberto no repositório espelhado.

## 6. Documentação

- `docs/FISCAL_ATIVACAO_PROVEDOR_REAL.md` — atualizado (nota sobre botão smoke).
- `docs/fiscal/RUNBOOK.md` — atualizado (seção "Alertas ativos" e uso do smoke pela UI).
- `README.md` — atualizado (links).
- **Nenhum documento foi removido.**

## 7. Onde o relatório anterior falhou

1. Afirmei "Dashboard Fiscal roteado" sem lembrar que o item de menu que o usuário vê é **Notas Fiscais**, não Dashboard Fiscal.
2. Afirmei "módulo no teto de prontidão em mock" sem exercitar o smoke (banco continua vazio) e sem confirmar que o avaliador de alertas está agendado.
3. Não sinalizei que **`NotasFiscais.tsx` e `SPED.tsx` continuam sendo stubs** — funcionalidades que o usuário efetivamente vê.

## 8. Estado real, honestamente

**Funcional para o usuário HOJE:**
- Rota `/fiscal/dashboard` (admin) renderiza com KPIs zerados e card de smoke.
- Botão "Rodar smoke mock" chama a edge function real.
- Emissão de NF-e pela tela de Vendas (`FiscalStatusBadge` + menu) funciona em mock — mas só se houver venda faturada.
- Alertas fiscais aparecem no dashboard porque as 4 seeds existem.

**Não funcional / stub:**
- `/fiscal/notas-fiscais` — abas Emitir, Consultar, Relatórios continuam com placeholder.
- `/fiscal/sped` — três abas com placeholder.
- KPIs do Dashboard Fiscal ficam em zero porque nunca se rodou o smoke.
- Cron do `evaluate-ops-alerts` não está agendado — regras fiscais existem, mas ninguém as executa.
- CI: workflow criado, mas execução não verificável a partir do Lovable.

## 9. Novo plano de ação (foco em UI visível)

Prioridade por impacto no que o usuário abre:

### P1 — Substituir stubs de `/fiscal/notas-fiscais`
- Reescrever `NotasFiscais.tsx`:
  - **Dashboard tab:** consumir `fiscal_metrics_daily` e listar as últimas notas de `fiscal_documentos_eletronicos` (usar hook similar ao `DashboardFiscal`).
  - **Emitir tab:** listar vendas faturadas sem NF-e + botão que abre `EmitirNFeDialog` (já existe em `src/components/fiscal/`).
  - **Consultar tab:** grid com filtros (status, período, número) sobre `fiscal_documentos_eletronicos`, ações → `DetalheNFeDrawer` (já existe).
  - **Relatórios tab:** manter placeholder honesto ("Requer SPED — ver Fiscal → SPED") ou remover a aba.

### P2 — Consolidar o Dashboard Fiscal
Duas opções, escolher uma:
- **A.** Mover o conteúdo do `DashboardFiscal` para a aba **Dashboard** de `/fiscal/notas-fiscais` (o item que o usuário já clica) e remover a rota `/fiscal/dashboard`, ou
- **B.** Renomear o item de menu de "Notas Fiscais" para "Notas Fiscais" com submenu (Dashboard, Consultar, Emitir) apontando para as sub-rotas.

Recomendo **A** — menos rotas, menos confusão de admin/não-admin.

### P3 — Popular o banco com dados reais (smoke automatizado)
- Criar uma edge function agendada (`fiscal-mock-populator`, cron diário) que:
  1. Encontra a venda de teste marcada e-mail-only.
  2. Chama `fiscal-smoke-run` internamente.
- Assim os KPIs deixam de ficar em zero.

### P4 — Agendar `evaluate-ops-alerts`
- Migration com `select cron.schedule('evaluate-ops-alerts', '*/5 * * * *', $$ select net.http_post(...) $$)`.
- Só depois disso as 4 regras fiscais viram "regras ativas" de fato.

### P5 — Reescrever `SPED.tsx`
- Fora do escopo urgente (SPED sem API real tem pouco valor). Deixar honestamente marcado como "aguardando provedor" em vez de "em desenvolvimento".

### P6 — Verificação visual
- Rodar Playwright autenticando como admin, capturar screenshots das 4 abas de `/fiscal/notas-fiscais` **antes e depois** de cada mudança acima e anexar a este documento. Sem prints, sem "concluído".

---

**Este documento tem prioridade sobre `docs/DIAGNOSTICO_FISCAL_REAL.md` e sobre o "Relatório de Execução" do turno anterior.**
