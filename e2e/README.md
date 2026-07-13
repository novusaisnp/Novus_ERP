# NOVUS ERP — Suíte E2E Playwright

Documentação da suíte End-to-End (E2E) do NOVUS ERP baseada em Playwright.
Este documento é o artefato oficial da **Fase P16.1** — congelamento dos fluxos críticos e detalhamento do fluxo F1.

> ⚠️ Neste momento nenhum código de teste foi implementado. Este README define **o que** será testado.
> A estrutura de pastas (`e2e/tests`, `e2e/pages`, `e2e/fixtures`) será criada na Fase P16.2.

---

## 1. Fluxos Críticos Congelados (5)

| ID | Fluxo | Impacto | Domínios Envolvidos |
|----|-------|---------|---------------------|
| **F1** | Login & Navegação Base | 🔴 Bloqueante | Auth, Layout, Sidebar |
| **F2** | Venda → Contas a Receber → Liquidação | 🔴 Alto | Vendas, Financeiro, Gestão Bancária |
| **F3** | Importação + Conciliação Bancária | 🔴 Alto | Gestão Bancária, Storage, Edge Functions |
| **F4** | Produto & Movimentação de Estoque | 🔴 Alto | Cadastros, Estoque |
| **F5** | CRUD Regras de Conciliação | 🟡 Médio | Gestão Bancária |

Cada fluxo terá um arquivo `NN-<slug>.spec.ts` sob `e2e/tests/` (a criar em P16.2).

---

## 2. Fluxo F1 — Login & Navegação Base (Detalhamento)

### 2.1 Objetivo

Garantir que um usuário válido consegue autenticar-se e acessar os módulos principais do ERP sem erros de console, com a empresa correta ativa no cabeçalho e todos os itens críticos do sidebar visíveis.

### 2.2 Pré-condições / Estado Inicial

| Item | Valor |
|------|-------|
| Tenant | `E2E TEST CO` (empresa dedicada, criada via seed em P16.2) |
| Usuário | `e2e@novus.test` |
| Senha | armazenada em `secrets.E2E_PASS` (CI) / `.env.e2e.local` (dev) — **nunca versionada** |
| Papel | `admin` limitado ao tenant `E2E TEST CO` |
| DB | Sem sessão ativa; sem toasts pendentes; caches TanStack limpos |
| Ambiente | `E2E_BASE_URL` (ex.: `http://localhost:8080` em dev; URL de preview no CI) |

### 2.3 Dados de Teste

```yaml
credenciais_validas:
  email: e2e@novus.test
  senha: ${E2E_PASS}
credenciais_invalidas:
  email: e2e@novus.test
  senha: senha-errada-e2e
empresa_esperada:
  nome_curto: E2E TEST CO
```

### 2.4 Passos do Usuário — Caminho Feliz

| # | Ação | Seletor Preferido |
|---|------|-------------------|
| 1 | Navegar para `${E2E_BASE_URL}/login` | — |
| 2 | Confirmar página de login carregada | `getByRole('heading', { name: /entrar|login/i })` |
| 3 | Preencher campo **E-mail** com `e2e@novus.test` | `getByLabel(/e-?mail/i)` |
| 4 | Preencher campo **Senha** com `${E2E_PASS}` | `getByLabel(/senha/i)` |
| 5 | Clicar no botão **Entrar** | `getByRole('button', { name: /entrar/i })` |
| 6 | Aguardar redirect para `/` ou `/dashboard` | — |
| 7 | Verificar cabeçalho com nome da empresa | `getByText('LIGNUM')` *(ou empresa e2e)* |
| 8 | Hover no sidebar para expandi-lo | `getByRole('navigation')` |
| 9 | Verificar itens do sidebar visíveis | ver 2.5 (asserções) |
| 10 | Navegar para **Vendas** → **Vendas** | `getByRole('link', { name: /^vendas$/i })` |
| 11 | Confirmar rota `/vendas/vendas` carregada | `expect(page).toHaveURL(/\/vendas\/vendas/)` |
| 12 | Voltar para **Financeiro** → **Contas a Receber** | `getByRole('link', { name: /contas a receber/i })` |
| 13 | Confirmar rota `/financeiro/contas-receber` | `expect(page).toHaveURL(...)` |
| 14 | Abrir **Gestão Bancária** → **Bancos** | `getByRole('link', { name: /^bancos$/i })` |
| 15 | Confirmar rota `/gestao-bancaria/bancos` | idem |
| 16 | Acessar dropdown de usuário e fazer **Sair** | `getByRole('button', { name: /selftnt|e2e@/i })` → `Sair` |
| 17 | Confirmar retorno à `/login` | `expect(page).toHaveURL(/\/login/)` |

### 2.5 Resultados Esperados (Asserções)

**UI:**
- `expect(page).toHaveURL(/\/(dashboard|)$/)` após login.
- Cabeçalho contém: nome da empresa (`E2E TEST CO`) e CNPJ formatado.
- E-mail do usuário visível no dropdown superior direito.
- Itens de sidebar visíveis (por `aria-label` ou texto):
  - Dashboard, Cadastros, Estoque, Vendas, Financeiro, Gestão Bancária, RH, Configurações.
- Toggle de tema (claro/escuro) presente e clicável.
- Após logout, campo de e-mail focado na `/login`.

**Console / Rede:**
- Zero `console.error` durante o fluxo.
- Zero requests com status ≥ 500.
- Nenhuma requisição a hosts externos não autorizados (whitelist: `*.supabase.co`, `brasilapi.com.br`).

**Estado do DB (via RPC de leitura ou fetch autenticado):**
- `auth.users` contém uma sessão ativa para `e2e@novus.test` durante o teste.
- Após logout: sessão encerrada (validar via ausência de storage `sb-*-auth-token`).

### 2.6 Caminho Alternativo — Credenciais Inválidas

| # | Ação | Resultado Esperado |
|---|------|--------------------|
| 1 | Preencher e-mail correto + senha errada | Toast/erro visível com mensagem "credenciais inválidas" (ou equivalente) |
| 2 | URL permanece em `/login` | `expect(page).toHaveURL(/\/login/)` |
| 3 | Nenhum item de sidebar renderizado | `sidebar` ausente |
| 4 | `auth.users` sem nova sessão | validado via helper de leitura |

### 2.7 Critérios de Aprovação do Fluxo F1

- [ ] Login com credencial válida em < 5s.
- [ ] Todos os 8 itens de sidebar visíveis após expandir.
- [ ] 3 navegações internas sem erros (Vendas, Contas a Receber, Bancos).
- [ ] Logout limpa a sessão e retorna à `/login`.
- [ ] Login com credencial inválida bloqueia acesso e exibe erro.
- [ ] Zero `console.error` e zero HTTP 5xx durante todo o fluxo.

### 2.8 Riscos Específicos de F1

| ID | Risco | Mitigação |
|----|-------|-----------|
| F1-R1 | Toast de erro some antes da asserção | `expect.poll` com timeout curto ou `waitFor` no toast |
| F1-R2 | Sidebar em modo hover instável em CI | forçar `mouse.move` explícito para a área do sidebar |
| F1-R3 | Session leakage entre testes | `storageState` isolado por spec + reset de storage no `beforeEach` |

---

## 3. Próximas Fases

- **P16.2** — Estrutura do projeto (`playwright.config.ts`, POMs, fixtures, seed de tenant E2E).
- **P16.3** — Implementação dos testes F1–F5 com POM.
- **P16.4** — Integração CI/CD (GitHub Actions), métricas de cobertura, governança.

---

## 4. Referências

- Plano macro: `P16` (planning-only) registrado no chat da sprint.
- Contratos preservados: P1–P15 (RLS, RPCs, edge functions existentes).
- Restrições: nada alterado em `src/integrations/**`, `scripts/**`, `evidence/**`.
- `DELIVERY_PROVIDER` permanece `noop`.

---

## 5. Execução — P16.4 (Consolidação)

### 5.1 Comandos locais

```bash
# 1) Subir o dev server (janela dedicada)
bun run dev  # http://localhost:8080

# 2) Instalar browsers do Playwright (uma vez)
bunx playwright install --with-deps chromium firefox

# 3) Rodar suíte completa
E2E_USER=e2e@novus.test \
E2E_PASS=<senha> \
E2E_BASE_URL=http://localhost:8080 \
bunx playwright test -c e2e/playwright.config.ts

# Rodar um único fluxo
bunx playwright test -c e2e/playwright.config.ts e2e/tests/05-regras-conciliacao.spec.ts

# Rodar apenas Chromium
bunx playwright test -c e2e/playwright.config.ts --project=chromium
```

### 5.2 Variáveis de ambiente necessárias

| Variável | Obrigatório | Uso |
|---|---|---|
| `E2E_USER` | sim | Email do usuário E2E (default `e2e@novus.test`) |
| `E2E_PASS` | sim | Senha do usuário E2E — nunca versionada |
| `E2E_BASE_URL` | opcional | Default `http://localhost:8080` |
| `VITE_SUPABASE_URL` | sim | Lido pelas fixtures `db-reset`/`db-read` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sim | idem |
| `E2E_START_DEV_SERVER` | opcional | `1` para o Playwright subir o Vite automaticamente |
| `CI` | auto | Playwright detecta e ativa retries/reporter GitHub |

### 5.3 Ordem de execução

`01-login.spec.ts` deve rodar primeiro — gera `e2e/.auth/user.json` reutilizado
pelos demais specs via `test.use({ storageState })`. Os specs 02–05 usam
`test.skip()` caso o storageState não exista.

Configuração `workers: 1` + `fullyParallel: false` no `playwright.config.ts`
garante que o `dbReset({ tenantName: 'E2E TEST CO' })` do `beforeEach` seja
idempotente — dois testes concorrentes no mesmo tenant causariam corrida.

### 5.4 CI (GitHub Actions — sugestão)

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    env:
      E2E_USER: ${{ secrets.E2E_USER }}
      E2E_PASS: ${{ secrets.E2E_PASS }}
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      E2E_START_DEV_SERVER: '1'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium firefox
      - run: bunx playwright test -c e2e/playwright.config.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### 5.5 Riscos remanescentes

- `dbReset` reseta apenas dados transacionais; a semente mestre (produtos,
  contas bancárias, colaboradores) deve estar pré-populada no tenant.
- Testes dependem de UI estável; mudanças em `data-testid` quebram POMs —
  centralize alterações via os POMs correspondentes.
- `workers: 1` limita paralelismo. Para paralelizar no futuro, será
  necessário isolar tenants por worker (`E2E TEST CO ${index}`).
