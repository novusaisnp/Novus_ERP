
# Comportamento dos Rateios no Pagamento de Contas a Pagar

## Visão Geral

Este documento explica como os rateios se comportam quando uma conta a pagar é paga integral ou parcialmente.

## Regra Principal

**Os rateios NUNCA são alterados durante o pagamento**. Eles permanecem como registro histórico imutável da distribuição contábil original.

## Cenários de Pagamento

### 1. Pagamento Integral
```
Conta Original: R$ 1.000,00
Rateios:
- Conta 1001 (Escritório): R$ 600,00 (60%)
- Conta 1002 (Fábrica): R$ 400,00 (40%)

Após Pagamento de R$ 1.000,00:
- Situação da conta: PAGA
- Valor atual: R$ 0,00
- Rateios permanecem: 
  - Conta 1001: R$ 600,00 (60%) [PRESERVADO]
  - Conta 1002: R$ 400,00 (40%) [PRESERVADO]
```

### 2. Pagamento Parcial
```
Conta Original: R$ 1.000,00
Rateios:
- Conta 1001 (Escritório): R$ 600,00 (60%)
- Conta 1002 (Fábrica): R$ 400,00 (40%)

Após Pagamento de R$ 300,00:
- Situação da conta: ABERTA
- Valor atual: R$ 700,00
- Rateios permanecem: 
  - Conta 1001: R$ 600,00 (60%) [PRESERVADO]
  - Conta 1002: R$ 400,00 (40%) [PRESERVADO]
```

## Justificativas Técnicas

### 1. Auditoria Contábil
- Os rateios representam a distribuição original planejada
- Alterar os rateios destruiria o histórico da decisão contábil
- Auditores precisam ver como os custos foram originalmente classificados

### 2. Análise de Custos
- Relatórios de centro de custo baseiam-se nos valores originais
- Comparações históricas dependem da consistência dos dados
- Análise de tendências requer dados imutáveis

### 3. Controle Orçamentário
- Orçamentos são baseados nas distribuições originais
- Mudanças nos rateios invalidariam as comparações orçamentárias
- Controle de custos precisa de dados consistentes

### 4. Conformidade Fiscal
- Rateios podem ter implicações fiscais
- Alterações posteriores poderiam gerar questionamentos
- Manter registro original é mais seguro

## Implementação Técnica

### Tabela de Rateios
```sql
CREATE TABLE rateios_contas_pagar (
  id UUID PRIMARY KEY,
  conta_pagar_id UUID REFERENCES contas_pagar(id),
  plano_conta_id UUID REFERENCES plano_contas(id),
  centro_custo_id UUID REFERENCES centros_custo(id),
  valor NUMERIC(15,2) NOT NULL,
  percentual NUMERIC(5,2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Regras de Negócio
1. **Criação**: Rateios são criados junto com a conta a pagar
2. **Edição**: Rateios podem ser editados apenas enquanto a conta não foi paga
3. **Pagamento**: Rateios permanecem inalterados durante qualquer pagamento
4. **Exclusão**: Rateios são preservados mesmo quando a conta é excluída (soft delete)

## Consultas Importantes

### Buscar Rateios Originais
```typescript
const rateios = await consultarRateiosOrigiais(contaId);
```

### Registrar Pagamento
```typescript
const resultado = await registrarPagamento({
  conta_pagar_id: contaId,
  valor_pago: 1000,
  data_pagamento: '2024-01-15',
  observacoes: 'Pagamento via transferência'
});
```

## Benefícios desta Abordagem

1. **Integridade dos Dados**: Dados históricos permanecem íntegros
2. **Auditabilidade**: Rastro completo de todas as decisões
3. **Simplicidade**: Lógica de pagamento não afeta estrutura contábil
4. **Conformidade**: Atende requisitos de auditoria e fiscalização
5. **Relatórios**: Permite análises consistentes ao longo do tempo

## Conclusão

Manter os rateios imutáveis durante os pagamentos é a abordagem mais robusta e confiável para um sistema ERP. Isso garante integridade dos dados, facilita auditorias e permite análises consistentes ao longo do tempo.
