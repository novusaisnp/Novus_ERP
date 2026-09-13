# Auditoria de prontidão para produção e mercado — NOVUS ERP

> Atualização posterior: a implementação local da etapa 1 e suas evidências estão em
> [Etapa 1 — integridade operacional](./ETAPA1_INTEGRIDADE_2026-09-13.md).
> As migrations foram ensaiadas com ROLLBACK, não publicadas. O diagnóstico abaixo
> registra o estado encontrado na auditoria, anterior a essas correções locais.

Data: 13/09/2026. Base local: commit `b660710dca6c2ff9d7adb0c5fc5b0abde706f0dc` mais alterações locais existentes. Banco consultado: `reksodqzemboaeqxnxyy`, confirmado como `ACTIVE_HEALTHY`.

## 1. Parecer executivo

**Não liberar, neste estado, como ERP completo para contratação ampla.** Há uma base funcional relevante para preparar um piloto assistido de gestão financeira e comercial de pequenas empresas. Antes desse piloto com dados operacionais, corrigir os bloqueadores de autorização, integridade de vendas/estoque e concorrência bancária descritos abaixo, estabelecer recuperação testada e fechar o escopo vendido.

O problema central já não é falta de telas. É a distância entre funcionalidades implementadas, operações confiáveis sob falha/concorrência, integrações externas ativadas e comprovação de implantação. A posição mais defensável é ERP financeiro/comercial para um segmento delimitado, com evolução do hub integrado aos satélites. Não há evidência para anunciar hoje contabilidade completa, departamento pessoal completo, fiscal completo, PDV resiliente ou ERP industrial abrangente.

Não foi atribuída nota percentual: contagem de telas ou checkboxes não mede capacidade comercial nem probabilidade de perda de dados. Um único bloqueador de autorização pode impedir a liberação mesmo com grande cobertura funcional.

## 2. Escopo e limites da evidência

Executados: leitura das instruções do projeto; inventário de rotas, serviços, funções e E2E; revisão dirigida de fluxos críticos; confronto com STATUS e Plano Mestre; typecheck, Vitest, lint e build; consultas somente de leitura a policies, grants, funções, triggers, configuração/documentos fiscais, cron e histórico de migrations no banco real; consulta dos últimos pipelines no GitHub; comparação com páginas oficiais de concorrentes.

Esta é uma auditoria ampla de engenharia e produto, com revisão aprofundada de amostras críticas. Não equivale a revisão linha a linha de todo o repositório, pentest, homologação fiscal/contábil ou certificação de conformidade. Não foram executados writes de negócio, emissão real, E2E com reset de dados, teste de carga, restauração, nem inspeção visual completa de todas as telas. Os testes locais usam as dependências instaladas; não comprovam instalação limpa.

O relatório distingue fatos observados, riscos demonstráveis pelo código e pendências documentadas. Alterações locais anteriores foram preservadas. Nenhuma correção funcional, migration ou deploy foi realizada nesta auditoria.

## 3. Verificações realizadas

| Verificação | Resultado atual | Consequência |
|---|---|---|
| Typecheck | Passou | Tipos da aplicação compilam; não cobre todas as funções Deno |
| Vitest | 58 arquivos, 417 testes passaram | Evidência positiva, limitada aos cenários existentes |
| Lint | **61 erros e 29 avisos** | O checkpoint que diz lint limpo não corresponde à execução global atual |
| Build | Passou | Bundle gerado; não prova operação em produção |
| Bundle principal | 3.065,62 kB, 808,63 kB gzip | Investigar carregamento inicial e reduzir imports antecipados |
| ExcelJS separado | 938,56 kB, 271,04 kB gzip | Medir custo dos relatórios; evitar carregamento desnecessário |
| Precache PWA | 9.523,86 KiB | Medir instalação/atualização em celular e rede lenta |
| Banco | Projeto ativo e saudável | Não equivale a integridade lógica ou backup recuperável |
| RLS das tabelas públicas | Todas as tabelas ordinárias encontradas têm RLS; só `entidade_id_map` não tem policies | Essa exceção é mapeamento de migração com uso restrito documentado; não foi classificada como bug |
| Cron | 7 jobs ativos, última execução de cada um `succeeded` | Sinal favorável; sucesso de agendamento HTTP não comprova entrega ou execução final da função |
| Fiscal persistido | 2 documentos, modelos 55 e 65, homologação, ambos com protocolo `MOCK` | Não há prova nesses registros de autorização real |
| Histórico remoto de migrations | Maior versão registrada: `20260830170000` | Há objetos posteriores no banco sem registro correspondente no histórico |
| CI do HEAD versionado | E2E e fiscal falharam | Release não tem comprovação automática verde |

Pipelines consultados:

- [E2E do HEAD](https://github.com/novusaisnp/Novus_ERP/actions/runs/34555429292): falhou na instalação de dependências; testes não chegaram a executar.
- [Fiscal do HEAD](https://github.com/novusaisnp/Novus_ERP/actions/runs/34555429267): instalação Bun falhou; etapa Deno também falhou; Playwright fiscal foi pulado.

As causas detalhadas dos erros de instalação/Deno não foram diagnosticadas pelos logs nesta auditoria. A divergência de portas abaixo é um problema adicional confirmado no código, não a causa atribuída à falha de instalação.

## 4. Achados que impedem ou condicionam produção

### A01 — Crítico: autorização granular incompleta no banco

No banco real, policies de `contas_bancarias` e `produtos` permitem INSERT/UPDATE/DELETE com `user_has_access_to_empresa(...) OR has_role_for_empresa(..., 'admin', ...)`. A definição de `user_has_access_to_empresa` apenas verifica a existência de vínculo em `user_roles`, sem exigir código de permissão. Os grants para `authenticated` incluem essas operações. Em `contas_receber`, o critério inclui a empresa devolvida por `get_user_empresa_id()`, também sem permissão granular por operação.

As rotas financeiras agora usam `PermissionRoute`, mas Gestão Bancária, Vendas, Estoque e Compras mantêm rotas sem esse gate em [App.tsx](../src/App.tsx). Um bloqueio de tela não protege uma chamada direta à API. Os triggers inspecionados em contas bancárias não acrescentam autorização: tratam timestamp, ativo/status e histórico. Em títulos há bloqueio de exclusão com liquidação, mas isso não é uma política geral de permissão.

**Impacto:** o perfil de consulta não está efetivamente restrito nas tabelas verificadas apenas por retirar permissões no catálogo. É falha de autorização dentro de uma empresa; esta constatação não demonstra vazamento entre tenants não autorizados.

**Saída:** matriz leitura/criação/edição/exclusão/aprovação aplicada no banco/RPC; teste negativo com perfil sem capacidade e chamada direta, incluindo impedir alteração direta de estado financeiro que deveria passar por RPC. Revisar grants excessivos, inclusive TRUNCATE, sem presumir que o PostgREST exponha essa operação.

### A02 — Crítico: venda e itens não são salvos atomicamente

[vendasService.ts](../src/services/vendasService.ts), método `save`: atualiza/cria cabeçalho, apaga itens antigos e insere itens novos em requisições distintas. Uma falha após o DELETE pode deixar cabeçalho atualizado e itens ausentes. A baixa de estoque ocorre depois e sua falha é capturada apenas em log. [useVendas.ts](../src/hooks/useVendas.ts) anuncia sucesso quando o serviço retorna.

O cancelamento segue o mesmo padrão: grava CANCELADO e tenta estornar o estoque, engolindo a falha do estorno.

**Saída:** transação no servidor para fatos que precisam acontecer juntos; para processos externos, estado pendente explícito e recuperação idempotente. Provar falha na reinserção de itens, falha de baixa e falha de estorno sem sucesso enganoso. Reutilizar o padrão de RPC já usado em títulos e recebimento de compras.

### A03 — Alto: edição após baixa não reconcilia quantidade de estoque

A função de baixa em [migration de vendas/estoque](../supabase/migrations/20260910160000_fix_bloco_a_vendas_estoque_admin_bypass.sql) pula o produto se já existe SAIDA ativa para venda+produto. O serviço de venda permite substituir os itens e chamar novamente a baixa. Essa idempotência evita repetição, mas não representa ajuste de quantidade.

**Cenário:** venda com 2 unidades já baixadas passa a 3; a rotina encontra a baixa anterior e não calcula a diferença. A retirada de um produto dos itens também não é reconciliada por esse laço. Risco demonstrado pela combinação dos caminhos locais; não reproduzido com write em produção.

**Saída:** impedir edição de itens após efetivação e oferecer reversão explícita, ou reconciliar diferenças de forma transacional e auditada. Verificar também exclusão lógica de venda com estoque já movimentado.

### A04 — Alto: saldo bancário sujeito a atualização perdida

[contaBancariaService.ts](../src/services/contaBancariaService.ts), `atualizarContaBancaria`: lê `saldo_inicial` e `saldo_atual`, calcula diferença no navegador e grava `saldo_atual = oldAtual + delta` depois. Se uma movimentação alterar o saldo entre leitura e escrita, o valor gravado pode perder esse movimento.

**Saída:** cálculo/bloqueio no banco ou saldo derivado do livro; teste de duas sessões concorrentes. A trilha histórica recém-criada ajuda a investigar, mas não impede essa inconsistência.

### A05 — Alto para multiempresa: escopo ativo inconsistente

[empresaAtiva.ts](../src/lib/empresaAtiva.ts) dá prioridade a `get_user_empresa_id()`. A função real retorna a primeira empresa em `user_roles` por data, não uma seleção de empresa ativa. Além disso, as listagens/estatísticas bancárias e a listagem de ordens de fabricação inspecionadas não filtram explicitamente a empresa ativa; a RLS permite todas as empresas às quais o usuário tem vínculo.

**Impacto:** risco de mistura de empresas autorizadas na mesma tela ou operação usando empresa diferente da selecionada. Não é evidência de acesso a empresa sem vínculo. O cenário multiempresa precisa de teste dirigido; não anunciar consolidação confiável só porque há cadastro matriz/filial.

**Saída:** contrato único de empresa ativa, filtros por empresa nos serviços aplicáveis e validação de cache/troca de contexto com usuário vinculado a duas empresas.

### A06 — Bloqueador fiscal comercial: emissão real não comprovada

A única configuração fiscal ativa encontrada é FOCUS_NFE/HOMOLOGACAO. Os dois documentos persistidos são mock. [fiscal-emitir-nfe](../supabase/functions/fiscal-emitir-nfe/index.ts) usa simulação por padrão se `FISCAL_MOCK` não estiver definido como `false`.

**Saída:** seguir [runbook fiscal existente](FISCAL_ATIVACAO_PROVEDOR_REAL.md), validar credencial/certificado/configuração do emitente, autorizar documento real de homologação, consultar status, recuperar XML/DANFE, cancelar quando aplicável e testar rejeição/retry. Separar visualmente simulação de autorização fiscal real e impedir simulação em ambiente comercial de produção. Não basta contratar o provedor.

### A07 — Alto: contingência NFC-e depende do provedor e tem contador concorrente

A numeração em contingência lê o maior número e soma 1 no código da função, sem reserva atômica nessa sequência. Duas vendas simultâneas podem selecionar o mesmo número; mesmo uma UNIQUE apenas transforma a corrida em falha de emissão. A reserva deve ser atômica.

Além disso, [FocusNFeProvider.ts](../supabase/functions/_shared/fiscal/providers/FocusNFeProvider.ts) continua fazendo HTTP ao provedor com `forma_emissao=offline`. Isso pode atender um modo de contingência com o provedor acessível, mas não estabelece emissão local sem internet ou com o próprio provedor indisponível. Não há prova de caixa offline nesta implementação.

**Saída:** reservar número no servidor, testar concorrência e recuperação; descrever exatamente qual indisponibilidade é suportada. Provar o fluxo de contingência e retransmissão com o provedor antes de comercializá-lo.

### A08 — Alto: release não reproduzível com confiança

Há alterações locais de frontend, funções e migrations ainda não versionadas. O histórico remoto para em agosto, mas a coluna de contingência e o trigger bancário de setembro existem no banco. Portanto, comparar apenas commit ou `migration list` não permite concluir o estado implantado.

Os workflows usam Bun, enquanto as instruções do ERP determinam npm. [e2e.yml](../.github/workflows/e2e.yml) define URL 8080, mas [vite.config.ts](../vite.config.ts) sobe 3000; o comando de servidor em [playwright.config.ts](../e2e/playwright.config.ts) não passa outra porta. O workflow fiscal executa Playwright sem o caminho explícito para essa configuração, tem conjunto Deno listado manualmente e não inclui automaticamente os novos testes de contingência. O teste fiscal atual verifica elementos de UI e não prova o ciclo completo de emissão.

**Saída:** uma instalação reproduzível, gates verdes, E2E efetivamente executado e inventário de versão do frontend/banco/funções. Reconciliar histórico de migrations somente após comparar definições; não reaplicar o backlog cegamente.

### A09 — Alto: recuperação operacional e alertas ainda sem prova suficiente

Há infraestrutura real de cron, relatórios agendados, limpeza e avaliação de alertas. Isso deve ser aproveitado. Porém, não foi apresentada evidência de restauração completa com RPO/RTO medidos. Os sete últimos cron status positivos não demonstram conclusão das operações HTTP invocadas.

A migration local `20260913160000_fin8_slo_probes_jobs_integracoes.sql` cria um wrapper para status de cron, mas a inspeção de `evaluate-ops-alerts/index.ts` não encontrou consumo desse wrapper nem da fila de webhooks. Não classificar essa nova frente como concluída somente pela migration. Ela própria registra que faltam tentativas falhadas de baixa/conciliação para calcular taxa real de erro.

**Saída:** restauração em ambiente isolado, incluindo banco e arquivos relevantes; alerta provocado recebido por um responsável; replay de integração demonstrado sem duplicidade; acompanhamento do resultado final, além do agendador.

## 5. O que existe e o que falta por módulo

“Implementado” abaixo significa evidência de código/estrutura e, onde indicado, banco; não homologação integral de todos os fluxos.

| Área | Base existente | Falta para oferta confiável |
|---|---|---|
| Cadastros | Entidades, clientes, fornecedores, produtos, serviços, usuários, perfis, centros de custo | Revisar permissões, importação inicial/duplicidade, experiência com volume e escopo por empresa |
| Financeiro operacional | Pagar/receber, rateios por RPC, liquidação, estorno, cancelamento, renegociação, recorrências, fluxo de caixa/competência | Fechar autorização direta, concorrência, reconciliação e prova dos cenários de falha |
| Gestão bancária | Bancos, agências, contas, movimentos, importação/conciliação e regras | Corrigir A01/A04/A05; integração bancária automática e experiência de resolução de divergências |
| Vendas e orçamentos | Cadastros, itens, conversão, pagamentos/títulos, PDF, vínculo com estoque | Atomicidade e edição pós-baixa; balcão, desconto percentual governado, comissões e melhores filtros |
| Compras | Requisição, cotação, portal público do fornecedor, pedidos, aprovação e recebimento por RPC | Devolução a fornecedor e permissões `compras.*`; validar ciclo completo parcial/total/cancelado com estoque e pagar |
| Estoque | Catálogo, localização, movimentação, inventário, Kardex e relatórios | Consertar integração de venda; lote/série/validade, picking e inventário cíclico conforme segmento |
| Fiscal | NF-e/NFC-e, cancelamento, CCe, consulta, XML/DANFE, estrutura MDF-e, configuração tributária | Homologação real; contingência comprovada; não há emissor NFS-e identificado na interface/provedores inspecionados |
| SPED | Listagem/download de arquivos; aviso de incompletude explícito | Geração está desabilitada em `SPED.tsx`; completar domínio e validar antes de vender a capacidade |
| Contabilidade | Estrutura de partidas dobradas e serviços de Balanço, DRE, DMPL e DFC via RPC | Cobertura integral dos fatos, períodos/fechamento, diário/razão/balancete, reconciliação e validação por contador |
| Ativo fixo | Cadastro e frente de depreciação indicada como implementada no plano, serviço e rota presentes | Validar cálculo/baixa e contabilização; integração automática com aquisição ainda pendente no plano |
| Alçadas | Motor, configuração, aprovação e consumidor em pedidos de compra | Generalizar cobertura conforme operações realmente vendidas; plano ainda contém texto antigo de “sem consumidor” |
| RH/DP | Colaboradores, cargos, departamentos, eventos/benefícios e lançamento manual de folha | Serviço recebe INSS/IRRF/FGTS prontos: não é motor de folha; férias/13º/rescisão/eSocial não comprovados |
| Ponto | Configuração e estruturas de registros | Fonte e sincronização operacional ainda pendentes segundo plano; homologar equipamento/provedor escolhido |
| Produção | Fichas técnicas e ordens; criação/conclusão/cancelamento via RPC | Teste integral de consumo/custo/resultado; MRP multinível e planejamento avançado fora da base atual |
| Caixa/PDV | Pagamentos em vendas e contas/cofre | Sessão de caixa, abertura, sangria, fechamento, conferência master e bloqueio pós-fechamento ainda no backlog |
| Integrações | Webhook de entrada, rotinas de retry, outbox e job ativo, porta de autorização | Provar entrega ponta a ponta por origem, replay, atraso e reconciliação; promessa comercial de integração exige operação real |
| Comunicação | Templates e contrato de delivery | `EmailProvider.send` sempre termina em falha controlada, mesmo com domínio configurado; envio real requer implementação/ativação |
| Relatórios | Dashboards, exports e infraestrutura de relatórios agendados/limpeza | Consultas sem paginação em partes do sistema, consolidação/volume, entrega real por e-mail, UX de falha |
| SaaS e implantação | Login, seleção/onboarding de empresa, provisionamento administrativo, PWA | Comprovar jornada cliente novo até primeira operação, plano/contrato/suporte, importação, saída/exportação e política de atualização |

Um gap de promessa concreto: `Orcamentos.tsx` apresenta “Serviços (NFS-e)” e “emite NFS-e”, enquanto a interface fiscal inspecionada implementa NF-e/NFC-e/MDF-e e não NFS-e. Tratar NFS-e como escopo não entregue até existir fluxo real; especialmente relevante se o mercado inicial for serviços ou educação.

## 6. Competitividade

O benchmark serve para identificar expectativas de compra, não atestar qualidade de concorrentes nem impor cópia de todas as funções.

- [Conta Azul](https://contaazul.com/sistema-erp/) apresenta integração entre financeiro, vendas, estoque e conciliação automática. Sua [página principal](https://contaazul.com/) destaca cobrança com avisos ao cliente. Para competir nesse público, o NOVUS precisa transformar controle financeiro em menos trabalho manual: importar, conciliar, cobrar, receber e acompanhar exceções.
- [Omie](https://www.omie.com.br/funcionalidades/) apresenta integração financeira/comercial e atualização de estoque ligada a vendas. A consequência para o NOVUS é clara: confiabilidade ponta a ponta vale mais que ampliar o menu com módulos ainda parciais.
- [Bling](https://parceiro.bling.com.br/funcionalidades) destaca canais de venda, estoque e integrações com marketplaces. Para disputar varejo omnicanal, o NOVUS teria esforço adicional de conectores, operação de balcão, logística e manutenção contínua dessas integrações.

**Posicionamento recomendado:** começar com um segmento em que gestão financeira/comercial e conexão aos satélites resolvam um problema concreto. É a hipótese de diferenciação mais coerente com a arquitetura existente; precisa ser validada por clientes. Não há pesquisa de disposição a pagar, entrevistas ou métricas de retenção nesta auditoria.

Prioridades comerciais depois dos bloqueadores: onboarding simples; importação de dados e saldos; cobrança Pix/boleto com retorno automático; conciliação assistida/automática; comprovantes e comunicação; integração com contador; atendimento e treinamento. NFS-e passa à frente se serviços for o nicho. Caixa/PDV e TEF passam à frente se balcão for o nicho. Marketplace só vira prioridade se e-commerce fizer parte do contrato.

Multimoeda, MRP avançado, motor genérico de workflow, expansão internacional e verticais adicionais não são pré-requisitos universais para lançar um ERP competitivo de pequeno negócio.

## 7. Plano de liberação com critérios verificáveis

| Ordem | Entrega | Critério de aceite |
|---|---|---|
| 1 | Segurança e integridade | Perfil leitura não escreve pela API; venda/itens/estoque consistentes sob falha; saldo não perde atualização concorrente; empresa ativa consistente |
| 2 | Release reproduzível | Instalação limpa, typecheck/testes/lint/build verdes, E2E executado em ambiente isolado, migrations/funções/frontend rastreáveis |
| 3 | Recuperação e operação | Restaurar cópia íntegra, medir perda máxima/tempo de recuperação, disparar e receber alerta, recuperar fila sem duplicar fatos |
| 4 | Fiscal e integrações do nicho | Fluxos reais homologados, simulação separada, rejeição/retry/cancelamento/arquivos verificados; NFS-e se prometida |
| 5 | Piloto assistido | Cliente novo importado, perfis distintos, um ciclo de venda→recebimento e compra→pagamento→conciliação fechado sem ajuste manual oculto |
| 6 | Oferta comercial | Escopo contratual honesto, suporte/responsável definidos, custo por cliente medido, onboarding/exportação/encerramento comprovados |

Testes mínimos de aceitação de integridade: negar escrita sem permissão; negar tenant não autorizado; duas operações simultâneas sobre o mesmo saldo; falha entre etapas da venda; venda alterada após baixa; cancelamento com erro no estorno; emissão/retry sem duplicar documento; restauração dos dados e arquivos de um cliente de teste.

Para piloto, sugestão operacional: poucos clientes do mesmo perfil, acompanhamento próximo e um fechamento mensal completo. É recomendação, não prazo garantido. Calendário e custo devem ser estimados após decompor os bloqueadores e definir emissor fiscal/PSP/segmento; as estimativas antigas em “sessões” do Plano Mestre não constituem compromisso de lançamento.

Além da engenharia, revisar com os responsáveis adequados contratos, privacidade, retenção, direitos de acesso/exportação, tratamento de incidentes e responsabilidades fiscal/contábil. A auditoria não verificou documentos jurídicos nem atesta conformidade legal.

## 8. Decisão prática

- **Hoje:** desenvolvimento avançado com funcionalidades reais, ainda reprovado para lançamento amplo.
- **Próximo marco:** piloto financeiro/comercial após correção dos bloqueadores e prova de recuperação, com escopo externo explicitamente limitado.
- **Lançamento competitivo:** estabilidade comprovada, integrações reais do segmento, implantação simples e suporte operacional.
- **ERP completo horizontal:** programa posterior; RH/DP, SPED, caixa, logística avançada e outras frentes não podem ser anunciados como concluídos pelo mero cadastro ou presença de rota.

O trabalho prioritário é fechar as transações, as permissões e a operação que já existem. A ampliação funcional deve seguir o segmento escolhido e os critérios de aceite, aproveitando RPCs, outbox e infraestrutura já presentes.
