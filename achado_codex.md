# Passagem de sessão — auditoria do ERP

Data: 13/09/2026. Projeto: `novusai-erp`. Correções e checkpoint enviados para
`origin/main` no commit `1f56389`. Este resumo foi criado depois desse commit.

## Orientação ao próximo agente

Leia e entenda este relatório, `AGENTS.md`, `docs/STATUS.md`,
`docs/AUDITORIA_PRONTIDAO_MERCADO_2026-09-13.md` e
`docs/ETAPA1_INTEGRIDADE_2026-09-13.md`. Depois, confronte com o código e o estado atual
e **incorpore os achados, ajustes e pendências ao `docs/PLANO_MESTRE.md`**, sem duplicar
backlog nem apagar trabalhos de outras sessões. Distinga sempre: implementado,
testado, implantado e homologado. Essa incorporação ainda não foi feita nesta sessão.

## O que foi encontrado

O ERP tem base relevante de financeiro, vendas, compras, estoque e integrações, mas
não está comprovadamente pronto para lançamento amplo. Os principais bloqueadores:

- Permissões de escrita no banco permitiam operações pelo simples vínculo à empresa.
- Venda gravava cabeçalho, apagava/recriava itens e baixava estoque separadamente;
  falhas podiam deixar dados parciais. Cancelamento ocultava falha de estorno.
- Edição de venda efetivada podia divergir do estoque; o estorno podia devolver em dobro.
- Saldo bancário era recalculado no navegador, sujeito a perder atualização concorrente.
- Empresa ativa inconsistente em partes dos serviços; fiscal real não comprovado
  (documentos observados eram mock); numeração de contingência sem reserva atômica.
- CI falhava no estado auditado, havia divergências de ferramentas/portas e histórico
  de migrations; recuperação por backup não tinha prova suficiente.
- SPED, folha completa, NFS-e e caixa/PDV não devem ser anunciados como entregues
  apenas porque existem telas ou estruturas. Priorizar um nicho e piloto assistido.

O relatório completo é uma fotografia anterior a outros commits da mesma data:
revalidar especialmente CI, lint e observabilidade. O checkpoint posterior de FIN-8
registra sondas já implantadas e backlog real de webhooks; não repetir o diagnóstico
antigo de sondas ausentes sem conferir.

## O que já foi ajustado e versionado

- Migration `20260913170000`: autorização por empresa em 26 tabelas e RPCs operacionais,
  restrição de escrita direta e dos campos aceitos ao salvar títulos.
- Migration `20260913171000`: saldo calculado no banco com bloqueio da conta;
  correção do trigger de histórico que impedia edição autenticada.
- Migration `20260913172000`: venda/itens/estoque em transação, totais no servidor,
  bloqueio de edição dos itens efetivados e cancelamento com estorno único.
- Serviços de vendas e contas bancárias adaptados; quatro testes novos;
  auditoria, procedimento de implantação e checkpoint registrados em `docs/`.

Validação: typecheck aprovado; **421 testes em 60 arquivos aprovados**; build aprovado
com avisos de bundle grande; lint dos arquivos alterados aprovado. Testes SQL no ERP
vinculado retornaram `checks_passed_rollback`, incluindo falhas injetadas e usuário
autenticado. Todo o ensaio de banco foi revertido, inclusive fixtures e migrations.

## O que falta — próxima sessão

1. ✅ **Incorporado ao `docs/PLANO_MESTRE.md` em 2026-09-13** (seções `FIN-0`, `FIN-8`,
   Fiscal, `ORC-1`, Manutenção transversal, Riscos ativos e novo item 8 da Parte 4).
   Reconciliado com trabalhos posteriores da mesma data (checkpoint FIN-8 de SLOs supera
   o diagnóstico de sondas ausentes deste relatório; texto obsoleto de "ORC-1 sem
   consumidor" também corrigido). Item permanece listado abaixo só como referência
   histórica do que foi pedido — a publicação coordenada (item 4) continua pendente.
2. Homologar concorrência real com duas conexões, E2E, perfis restritos e os fluxos
   financeiros/compras afetados. O teste bancário executado foi sequencial.
3. Resolver o contrato de empresa ativa e testar troca de contexto/cache com duas empresas.
4. Preparar implantação coordenada de banco e frontend, com recuperação validada.
   **As três migrations NÃO foram aplicadas permanentemente. Push não comprova deploy.**
   O frontend novo depende de RPCs novas; a ACL nova bloqueia o frontend antigo.
   Conferir eventual deploy automático antes de liberar uso. Não publicar um lado
   isoladamente nem reaplicar todo o backlog com `db push`.
5. Prosseguir com release reproduzível/CI, backup e restauração, fiscal real,
   integrações e piloto assistido, conforme prioridades da auditoria.

Não declarar a etapa integralmente homologada nem o ERP pronto para produção.
O procedimento detalhado de aplicação e verificação está em
`docs/ETAPA1_INTEGRIDADE_2026-09-13.md`.
