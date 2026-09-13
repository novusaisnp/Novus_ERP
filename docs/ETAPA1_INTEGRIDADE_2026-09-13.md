# Etapa 1 — integridade operacional

## Entrega local

- `20260913170000`: permissões por empresa, policies restritivas em 26 tabelas,
  guardas nas RPCs operacionais e limitação de campos cadastrais ao salvar títulos.
- `20260913171000`: saldo inicial ajustado com o valor atual da linha bloqueada;
  movimentos recalculam saldo depois de bloquear a conta; histórico gravado pelo trigger.
- `20260913172000`: venda, itens e estoque na mesma transação; totais no servidor;
  bloqueio do produto antes da validação de saldo; cancelamento com estorno único.
- Serviços de vendas e contas bancárias adaptados, com quatro testes de regressão.

Reutilizados os motores financeiros e de estoque existentes, sem novas dependências.
Mudanças anteriores de outros trabalhos foram preservadas.

## Evidências executadas

- `npm run typecheck`: aprovado.
- `npm run test -- --run`: 421 testes / 60 arquivos aprovados.
- `npm run build`: aprovado, com avisos de bundle grande e imports mistos.
- ESLint dos serviços alterados, seus testes e `scripts/check-etapa1.mjs`: aprovado.
- `node scripts/check-etapa1.mjs`: `checks_passed_rollback` no ERP vinculado
  `reksodqzemboaeqxnxyy`; migrations e fixtures inteiramente revertidas.

O ensaio SQL cobre autorização entre empresas, escrita direta proibida, total calculado
no servidor, rollback após falha na inserção de itens, estoque insuficiente, proibição
de alterar itens efetivados, avanço de status sem repetir baixa, rollback após falha
de estorno, cancelamento repetido sem duplicar estoque, saldo não forjável pelo cliente,
alteração de saldo inicial preservando movimento e exclusão lógica recalculando saldo.

Limites: o ensaio de saldo é sequencial, não prova concorrência com duas conexões;
não foi executada homologação visual/E2E nem teste completo de todas as RPCs financeiras
e de compras afetadas. As proteções implementadas não equivalem a um pentest completo.

## Publicação coordenada — pendente

O pacote foi preparado para versionamento e envio ao GitHub a pedido do responsável.
Não houve deploy manual ou aplicação permanente dessas migrations nesta etapa.
A versão antiga do frontend grava diretamente em vendas/itens: a nova ACL bloqueia
esse caminho. Portanto, não aplicar o banco sozinho com clientes antigos operando.

1. Homologar o pacote em ambiente separado, incluindo dois clientes simultâneos,
   conversão de orçamento, recebimento de compra, criação/edição/liquidação de título
   e perfis sem administração. Confirmar backup e procedimento de recuperação.
2. Preparar a versão do frontend com os serviços novos; estabelecer janela de
   manutenção que impeça operações de clientes antigos, inclusive abas já abertas.
3. Confirmar o projeto ERP e histórico de migrations. Aplicar somente este pacote com
   `node scripts/check-etapa1.mjs --apply`; não usar `db push` indiscriminadamente.
   O comando registra as três versões e faz COMMIT em uma transação única.
4. Publicar o frontend correspondente e executar
   `node scripts/check-etapa1.mjs --verify` (testes revertidos, sem reaplicar migrations).
   Executar smoke tests autenticados e reabrir o acesso somente após aprovação.

Falha durante aplicação reverte a transação inteira. Depois de aplicada, não basta
reverter apenas o frontend: ele depende das RPCs novas. Em incidente, manter manutenção
e corrigir o pacote; restauração de banco exige o procedimento de recuperação previamente
homologado e avaliação dos dados gravados desde a publicação.
