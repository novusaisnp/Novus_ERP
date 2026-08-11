# NOVUS ERP — Roadmap 2026

Fonte de verdade do que falta no ERP. Histórico e checkpoint operacional ficam em
[`STATUS.md`](./STATUS.md). Este roadmap é incremental: uma fase só avança quando seus
critérios de saída estão comprovados.

## Regras de execução e continuidade

- Prioridade atual: **Programa Financeiro Robusto — Fase FIN-0**.
- Cada entrega deve caber em um checkpoint verificável e deixar o sistema executável.
- Nenhuma operação financeira composta pode depender de compensação manual entre chamadas.
- Alterações de schema/RLS/constraints exigem validação contra o banco real antes da migration.
- Ao pausar, atualizar o topo de `STATUS.md` com: concluído, pendente, arquivos, validações,
  riscos e **próxima ação única**.
- Documentação e checkpoints são agnósticos de ferramenta: não citar fornecedor, marca, assistente
  ou ambiente pessoal; registrar apenas evidência técnica reproduzível no repositório.
- Marcação: `[ ]` pendente, `[~]` em execução, `[x]` concluído, `[!]` bloqueado.
- Itens deste programa são indispensáveis; podem ser reordenados por dependência, não removidos
  sem decisão explícita registrada.

---

## Programa Financeiro Robusto

Objetivo: servir desde operação simples de caixa até grupo econômico multiempresa/multifilial,
sem expor complexidade corporativa para quem não precisa dela.

### FIN-0 — Integridade e segurança transacional

**Estado:** `[~]` iniciado em 2026-08-11.

- [x] Unificar status de UI e banco em baixa, estorno e cancelamento.
- [~] Validar no banco real constraints, triggers, FKs e policies de todas as tabelas financeiras
  (núcleo de liquidação auditado; demais domínios continuam pendentes).
- [x] Criar RPC transacional e idempotente para liquidar título.
- [x] Na mesma transação: bloquear título, validar saldo, gravar liquidação, atualizar título,
  gerar/vincular movimentação bancária e registrar histórico.
- [x] Criar RPC transacional para estornar uma liquidação específica.
- [x] Criar RPC transacional para cancelar título, impedindo cancelamento incompatível com baixas.
- [ ] Tornar criação/edição de título + rateios atômica em pagar e receber.
- [x] Suportar baixa parcial real (`PARCIAL`) e impedir valor acima do saldo.
- [x] Adicionar chave de idempotência e proteção contra concorrência/duplo clique no banco.
- [x] Eliminar caminhos duplicados de liquidação e manter um serviço canônico.
- [ ] Diferenciar erro técnico de lista vazia; falhas não podem virar zeros silenciosos.
- [x] Aplicar permissões financeiras reais na UI, serviço/RPC e RLS.
- [ ] Bloquear exclusão física de título já movimentado; correção deve ocorrer por estorno.
- [ ] Provar isolamento entre empresas em leitura e escrita.

**Critério de saída:** testes de integração provam que falha intermediária faz rollback total,
duas baixas concorrentes não duplicam pagamento e nenhum usuário opera fora do seu escopo.

### FIN-1 — Completar fluxos atualmente parciais ou apenas visuais

- [~] Submodal de cancelamento com motivo obrigatório, impacto e confirmação
  (implementado e aguardando validação visual local).
- [~] Submodal de estorno escolhendo a liquidação, motivo, data e conta afetada
  (seleção, motivo e conta concluídos; data efetiva controlada pelo servidor; data contábil manual pendente).
- [ ] Submodal de baixa parcial com juros, multa, desconto e saldo posterior.
- [ ] Divisão da baixa entre múltiplas contas/meios de pagamento.
- [ ] Renegociação: substituir título por novas parcelas preservando rastreabilidade.
- [ ] Gestão de rateios de pagar e receber no detalhe do título.
- [ ] Vincular uma movimentação bancária existente ou criar e conciliar uma nova.
- [ ] Cadastro rápido de entidade nos consumidores financeiros usando o cadastro central.
- [ ] Aplicar filtros já declarados de conta bancária e usuário.
- [ ] Corrigir upload/remoção de documentos para aguardar conclusão real da mutation.
- [ ] Operações em lote com revisão antes de executar.
- [ ] Testes E2E: criar, editar, liquidar parcial/total, cancelar, estornar e conciliar.

**Critério de saída:** nenhum botão financeiro termina em “em breve”, no-op ou toast fictício.

### FIN-2 — Workspace financeiro e escala básica

- [ ] Transformar `/financeiro/movimentacoes` em página de trabalho; modal só para ação curta.
- [ ] Painel lateral de detalhe com histórico, documentos, rateios e conciliação.
- [ ] Paginação, busca, filtros e ordenação server-side em listas financeiras.
- [ ] Indicadores e agrupamentos calculados no PostgreSQL, não sobre toda a base no navegador.
- [ ] Estados acessíveis de loading, erro e vazio; navegação por teclado e foco em diálogos.
- [ ] Visões salvas, filtros persistentes e exportação do conjunto filtrado.
- [ ] Relatórios grandes assíncronos; limites e avisos claros de volume.

**Critério de saída:** listas permanecem utilizáveis com pelo menos 1 milhão de títulos no tenant
de benchmark sem carregar o conjunto completo no cliente.

### FIN-3 — Pequeno negócio e caixa diário

- [ ] Onboarding financeiro simplificado com plano de contas e categorias padrão.
- [ ] Modo simples que oculta dimensões avançadas sem removê-las do modelo.
- [ ] Abertura e fechamento de caixa por operador/turno.
- [ ] Sangria, suprimento, conferência e diferença esperado × contado.
- [ ] Visão diária: entradas, saídas, saldo, vencimentos e atrasos.
- [ ] Recorrências monitoradas, com falhas e próxima geração visíveis.
- [ ] Lembretes de cobrança e comprovantes pelo celular.
- [ ] Cobrança Pix/boleto/link por adaptador de PSP autorizado.
- [ ] Importação OFX/CSV com mapeamento assistido e prevenção de duplicidade.

**Critério de saída:** uma empresa de caixa único consegue operar sem configurar contabilidade,
filiais ou workflow corporativo manualmente.

### FIN-4 — Subledger e contabilidade por partidas dobradas

- [ ] Livro imutável de lançamentos e linhas débito/crédito balanceadas.
- [ ] Regras de contabilização para títulos, liquidações, tarifas, transferências e estornos.
- [ ] Períodos contábeis, fechamento, reabertura autorizada e lançamento retroativo auditado.
- [ ] Plano de contas versionado e mapeamento referencial.
- [ ] Livro diário, razão, balancete, DRE e balanço derivados do mesmo livro.
- [ ] Trilhas para ECD/ECF/SPED sem misturar regra fiscal ao núcleo financeiro.
- [ ] Reconciliação entre subledgers de pagar/receber/bancos e razão geral.

**Critério de saída:** todo evento financeiro contabilizado produz débito = crédito e só pode ser
corrigido por lançamento reverso auditável.

### FIN-5 — Grupo econômico, multiempresa e multifilial

- [ ] Modelar grupo econômico → empresa legal → estabelecimento matriz/filial.
- [ ] Separar estabelecimento, unidade de negócio, centro de custo, projeto e canal.
- [ ] Escopo do usuário por grupo/empresa/filial, aplicado também nas RPCs e relatórios.
- [ ] Dimensões obrigatórias/configuráveis por empresa e tipo de lançamento.
- [ ] Tesouraria e contas a pagar centralizadas com operação local controlada.
- [ ] Workflow de aprovação por valor, categoria, filial e centro de custo.
- [ ] Segregação solicitante × aprovador × pagador e substituição temporária auditada.
- [ ] Orçamento, realizado e compromissado por dimensão.
- [ ] Operações intercompany, contas recíprocas e eliminações.
- [ ] Relatórios isolados e consolidados por qualquer nível da hierarquia.

**Critério de saída:** grupo com várias empresas e filiais fecha e consolida sem compartilhar dados
com usuários fora do escopo nem usar centro de custo como filial.

### FIN-6 — Multimoeda e operação internacional

- [ ] Moeda funcional por empresa, moeda da transação e moeda de apresentação.
- [ ] Taxa, data, fonte e política de câmbio rastreáveis.
- [ ] Ganhos/perdas cambiais realizados e não realizados.
- [ ] Consolidação com conversão e eliminações intragrupo.
- [ ] Calendário, timezone e período fiscal por jurisdição.
- [ ] Adaptadores fiscais por país desacoplados do subledger.

**Critério de saída:** transações e consolidação multimoeda são reproduzíveis a partir das taxas
registradas, sem sobrescrever o valor original.

### FIN-7 — Integrações financeiras e automação

- [ ] Inbox/outbox transacional, retry com backoff, fila de falhas e replay auditado.
- [ ] Idempotência obrigatória nas Portas Título, Liquidação e Autorização.
- [ ] CNAB 240 para remessa/retorno conforme provedores priorizados.
- [ ] Open Finance para contas, saldos e transações via integração autorizada.
- [ ] Adaptadores Pix, boleto, adquirentes e gateways sem acoplar o domínio ao provedor.
- [ ] Modelo canônico compatível com conceitos de cash management/ISO 20022.
- [ ] Observabilidade por origem: volume, latência, erro, duplicidade e atraso.

**Critério de saída:** qualquer evento externo pode ser reprocessado com segurança e sua origem é
rastreável até o lançamento financeiro/contábil resultante.

### FIN-8 — Operação, segurança e conformidade contínua

- [ ] Baseline OWASP ASVS 5.0 para autenticação, autorização, validação e auditoria.
- [ ] MFA/step-up para ações críticas configuráveis.
- [ ] Alertas de alteração bancária, pagamento duplicado e comportamento anômalo.
- [ ] Logs sem segredos ou dados pessoais/financeiros desnecessários.
- [ ] SLOs para baixa, conciliação, jobs e integrações; alertas acionáveis.
- [ ] Backup, restauração e disaster recovery testados periodicamente.
- [ ] Testes de propriedade para dinheiro, concorrência, isolamento e invariantes contábeis.
- [ ] Particionamento/arquivamento apenas guiado por medição.

**Critério de saída:** controles, recuperação e auditoria são comprovados por exercício, não apenas
por configuração declarada.

---

## Demais frentes indispensáveis do ERP

### Integração hub ↔ satélites

- [ ] Completar envelope canônico onde ainda faltar, validando consumidores reais.
- [ ] Catálogo de eventos e webhook de saída para fatos de negócio.
- [ ] Adaptador do Educacional como primeiro caso real; não criar adaptador genérico especulativo.
- [ ] Dashboard por `source_system` com volume, erro, latência e replay.
- [ ] Manter contrato de 3 portas e HMAC como padrão obrigatório.

### Comercial e operação de balcão

- [ ] Comissionamento por vendedor/período, seguido de regras por categoria quando necessário.
- [ ] Fluxo rápido/balcão dentro de Vendas, reutilizando venda/pagamento/estoque existentes.
- [ ] Desconto percentual com alçada e auditoria.
- [ ] NFC-e e evolução fiscal comprovada em homologação real.

### Fiscal, RH e estoque especializado

- [ ] Fiscal completo: NFC-e, CCe, contingência e consulta de status.
- [ ] Folha real ou integração homologada; decidir build × parceiro antes de implementar cálculos.
- [ ] Bem locável/serializado separado do estoque fungível antes do satélite de locação.
- [ ] Custom fields somente após caso real; preferir `metadata jsonb` antes de EAV, salvo prova contrária.

### Manutenção transversal

- [ ] Remover chamadas Supabase de componentes/hooks e respeitar `src/services/**`.
- [ ] Eliminar logs de debug e `any` por área, mantendo gates verdes.
- [ ] Manter rotas canônicas, estados vazios úteis e seletores escaláveis.
- [ ] Revisar RLS, UNIQUE/onConflict, CHECKs e FKs no banco real em cada frente.

---

## Sequência executiva atual

1. **FIN-0:** status canônicos e baseline de regressão.
2. **FIN-0:** auditoria do banco real e desenho das RPCs transacionais.
3. **FIN-0:** liquidação atômica ponta a ponta.
4. **FIN-0:** estorno/cancelamento + permissões reais.
5. **FIN-1:** ligar todos os fluxos atualmente apenas visuais.
6. Retomar a próxima frente conforme dependências, mantendo FIN-2+ como metas obrigatórias.

## Riscos ativos

| Risco | Nível | Mitigação obrigatória |
|---|---:|---|
| Operações financeiras compostas no cliente | crítico | RPC transacional + rollback + teste de concorrência |
| Status UI/DB divergentes | crítico | vocabulário canônico central + regressão |
| Permissões financeiras decorativas | crítico | autorização no banco; UI apenas reflete capacidade |
| Schema real divergir das migrations | alto | consultar banco real antes de qualquer DDL |
| Listas/relatórios client-side | alto | paginação e agregação server-side |
| Modelo plano de empresas | alto | grupo/empresa/estabelecimento antes de consolidação |
| Vendor lock-in Supabase | médio | manter domínio atrás de `src/services/**`; abstrair só com alternativa real |
| Complexidade exposta ao pequeno negócio | médio | progressive disclosure e defaults, não outro produto |

## Decisões que só serão abertas quando a fase exigir

1. Provedor inicial de Pix/boleto/Open Finance.
2. Matriz de alçadas e segregação por perfil de cliente.
3. Profundidade fiscal/contábil entregue internamente versus parceiros.
4. País/moeda inicial após BRL para validar FIN-6.
5. Estratégia de custom fields após primeiro caso concreto.
