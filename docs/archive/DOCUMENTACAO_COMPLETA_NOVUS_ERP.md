
# DOCUMENTAÇÃO COMPLETA - NOVUS ERP MODULAR

## 📋 ÍNDICE

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Banco de Dados](#banco-de-dados)
5. [Serviços](#serviços)
6. [Componentes](#componentes)
7. [Hooks e Utils](#hooks-e-utils)
8. [Tipos TypeScript](#tipos-typescript)
9. [Integração Supabase](#integração-supabase)
10. [Configurações](#configurações)

---

## 📌 VISÃO GERAL DO SISTEMA

O NOVUS ERP é um sistema de gestão empresarial modular desenvolvido em React/TypeScript com Supabase como backend. O sistema oferece funcionalidades completas para:

- **Gestão Financeira**: Contas a pagar/receber, fluxo de caixa, liquidações
- **Recursos Humanos**: Colaboradores, folha de pagamento, registro de ponto
- **Cadastros Básicos**: Clientes, fornecedores, produtos, serviços
- **Configurações**: Centros de custo, plano de contas, naturezas de caixa
- **Integração**: Sincronização com sistemas externos via APIs

---

## 🏗️ ARQUITETURA E TECNOLOGIAS

### Stack Principal
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (PostgreSQL + Row Level Security)
- **Estado**: React Query (@tanstack/react-query)
- **Roteamento**: React Router Dom
- **Formulários**: React Hook Form + Zod
- **Ícones**: Lucide React

### Padrões Arquiteturais
- **Modular**: Cada módulo do ERP é independente
- **Service Layer**: Separação clara entre UI e lógica de negócio
- **Type-Safe**: TypeScript rigoroso em toda aplicação
- **Component-Driven**: Componentes reutilizáveis do Shadcn/UI

---

## 📁 ESTRUTURA DO PROJETO

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base do Shadcn/UI
│   └── test/           # Componentes para testes
├── data/               # Dados estáticos/constantes
├── hooks/              # Custom hooks
├── integrations/       # Configurações de integração
│   └── supabase/       # Cliente e tipos Supabase
├── lib/                # Utilitários gerais
├── pages/              # Páginas da aplicação
├── services/           # Camada de serviços
├── types/              # Definições de tipos TypeScript
└── utils/              # Funções utilitárias
```

---

## 🗄️ BANCO DE DADOS

### Tabelas Principais

#### **GESTÃO FINANCEIRA**

**contas_pagar**
```sql
- id: UUID (PK)
- numero_documento: VARCHAR (Número da NF/documento)
- descricao: TEXT (Descrição da conta)
- fornecedor_id: UUID (FK -> fornecedores)
- plano_conta_id: UUID (FK -> plano_contas)
- centro_custo_id: UUID (FK -> centros_custo)
- valor_original: NUMERIC(15,2)
- valor_atual: NUMERIC(15,2)
- data_vencimento: DATE
- data_emissao: DATE
- situacao: VARCHAR (ABERTA|PAGA|VENCIDA|CANCELADA)
- recorrente: BOOLEAN
- anexos: JSONB (documentos anexados)
- tags: JSONB (etiquetas para organização)
```

**contas_receber**
```sql
- id: UUID (PK)
- numero_documento: VARCHAR
- cliente_id: UUID (FK -> clientes)
- venda_id: UUID (FK -> vendas)
- contrato_id: UUID (FK -> contratos)
- valor_original: NUMERIC(15,2)
- valor_pago: NUMERIC(15,2)
- data_vencimento: DATE
- situacao: VARCHAR (ABERTA|RECEBIDA|VENCIDA|CANCELADA)
- forma_pagamento: VARCHAR
- sync_metadata: JSONB (dados de sincronização)
```

**liquidacoes_titulos**
```sql
- id: UUID (PK)
- titulo_id: UUID (referência genérica)
- tipo_titulo: TEXT (CONTAS_PAGAR|CONTAS_RECEBER)
- valor_pago: NUMERIC(15,2)
- data_pagamento: DATE
- forma_pagamento: TEXT
- conta_bancaria_id: UUID (FK -> contas_bancarias)
- estornado: BOOLEAN
- desconto_concedido: NUMERIC(15,2)
- juros_pagos: NUMERIC(15,2)
```

**contas_bancarias**
```sql
- id: UUID (PK)
- agencia_id: UUID (FK -> agencias_bancarias)
- numero_conta: VARCHAR
- titular: VARCHAR
- saldo_atual: NUMERIC(15,2)
- limite_credito: NUMERIC(15,2)
- conta_cofre: BOOLEAN (conta virtual interna)
- configuracoes: JSONB (alertas, limites)
- status: VARCHAR (ATIVA|INATIVA|BLOQUEADA)
```

#### **RECURSOS HUMANOS**

**colaboradores**
```sql
- id: UUID (PK)
- nome_completo: VARCHAR
- cpf: VARCHAR (UNIQUE)
- email: VARCHAR
- cargo_id: UUID (FK -> cargos)
- departamento_id: UUID (FK -> departamentos)
- data_admissao: DATE
- data_demissao: DATE
- salario_base: NUMERIC(15,2)
- regime_contratacao: VARCHAR (CLT|PJ|ESTAGIARIO)
- endereco: JSONB
- situacao: BOOLEAN (ativo/inativo)
```

**registros_ponto**
```sql
- id: UUID (PK)
- colaborador_id: UUID (FK -> colaboradores)
- data_ponto: DATE
- entrada_manha: TIME
- saida_almoco: TIME
- volta_almoco: TIME
- saida_tarde: TIME
- horas_trabalhadas: NUMERIC(5,2)
- horas_extras: NUMERIC(5,2)
- origem: VARCHAR (MANUAL|IMPORTADO|API)
```

**folha_pagamento**
```sql
- id: UUID (PK)
- colaborador_id: UUID (FK -> colaboradores)
- competencia: DATE
- salario_base: NUMERIC(15,2)
- horas_extras: NUMERIC(15,2)
- beneficios: NUMERIC(15,2)
- descontos: NUMERIC(15,2)
- total_bruto: NUMERIC(15,2)
- total_liquido: NUMERIC(15,2)
- status: VARCHAR (Pendente|Aprovada|Paga)
```

#### **CADASTROS BÁSICOS**

**clientes**
```sql
- id: UUID (PK)
- nome: VARCHAR
- tipo: CHAR(1) (F=Física, J=Jurídica)
- cpf_cnpj: VARCHAR
- emails: JSONB (lista de emails)
- telefones: JSONB (lista de telefones)
- endereco: JSONB (endereço completo)
- dados_pessoais: JSONB (PF: estado civil, profissão)
- nome_fantasia: VARCHAR (PJ)
- cnae: VARCHAR (PJ)
- contatos: JSONB (PJ: lista de contatos estruturados)
- setor_id: UUID (FK -> setores_empresa)
```

**fornecedores**
```sql
- id: UUID (PK)
- tipo_pessoa: VARCHAR (PJ|PF)
- razao_social: VARCHAR
- nome_fantasia: VARCHAR
- cnpj: VARCHAR
- cpf: VARCHAR (para PF)
- endereco: JSONB
- contato_principal: JSONB
- dados_bancarios: JSONB
- anexos_pj: JSONB (contrato social, CNPJ)
- anexos_pf: JSONB (RG, comprovantes)
```

**produtos**
```sql
- id: UUID (PK)
- nome: VARCHAR
- codigo_barras: VARCHAR
- preco_compra: NUMERIC(10,2)
- preco_venda: NUMERIC(10,2)
- estoque_atual: INTEGER
- categoria: VARCHAR
- ncm: VARCHAR (classificação fiscal)
- variacoes: JSONB (cores, tamanhos)
- ficha_tecnica: TEXT
- modo_preparo: TEXT
```

#### **CONFIGURAÇÕES**

**plano_contas**
```sql
- id: UUID (PK)
- codigo: VARCHAR (1.1.01)
- nome: VARCHAR
- tipo: VARCHAR (RECEITA|DESPESA)
- id_pai: UUID (FK -> plano_contas)
- nivel: INTEGER (1-5)
- analitica: BOOLEAN (pode receber lançamentos)
```

**centros_custo**
```sql
- id: UUID (PK)
- nome: VARCHAR
- codigo: VARCHAR
- descricao: TEXT
- ativo: BOOLEAN
```

### Triggers e Funções

**update_conta_analitica()**
- Atualiza automaticamente o campo `analitica` quando contas recebem filhos
- Contas com filhos = sintéticas (false)
- Contas sem filhos = analíticas (true)

**validate_conta_analitica_rateio()**
- Valida que apenas contas analíticas podem ser usadas em rateios
- Previne erros de lançamento contábil

**update_updated_at_column()**
- Trigger genérico para atualizar campo `updated_at` automaticamente

---

## 🔧 SERVIÇOS

### Estrutura dos Serviços

Todos os serviços seguem o padrão:
```typescript
export const nomeService = {
  async fetchItems(): Promise<Item[]>
  async createItem(data: ItemInput): Promise<Item>
  async updateItem(id: string, data: ItemInput): Promise<Item>
  async deleteItem(id: string): Promise<void>
}
```

### Serviços Implementados

#### **usuarioService.ts**
```typescript
- fetchUsuarios(): Busca todos usuários
- createUsuario(data): Cria novo usuário
- updateUsuario(id, data): Atualiza usuário
- deleteUsuario(id): Remove usuário
```

#### **setorService.ts**
```typescript
- fetchSetores(): Lista setores ativos
- createSetor(data): Cria novo setor
```

#### **vencimentoPadraoService.ts**
```typescript
- fetchVencimentos(): Lista vencimentos padrão
- createVencimento(data): Cria vencimento
- updateVencimento(id, data): Atualiza vencimento
- deleteVencimento(id): Desativa vencimento
```

#### **unidadeMedidaService.ts**
```typescript
- getAll(): Busca unidades ativas
- getById(id): Busca por ID
- create(data): Cria nova unidade
- update(id, data): Atualiza unidade
- delete(id): Desativa unidade
```

#### **tamanhoService.ts**
```typescript
- getAll(): Lista tamanhos de produtos
- getById(id): Busca tamanho específico
- create(data): Cria novo tamanho
- update(id, data): Atualiza tamanho
- delete(id): Desativa tamanho
```

#### **localizacaoService.ts**
```typescript
- getAll(): Lista localizações de estoque
- getById(id): Busca localização
- create(data): Cria localização
- update(id, data): Atualiza localização
```

#### **fiscalService.ts**
```typescript
- Módulo de re-exportação para serviços fiscais
- configService: Configurações fiscais
- naturezaService: Naturezas de operação
- cfopService: Códigos CFOP
- tributoService: Tributos
- ncmService: Nomenclatura NCM
```

#### **syncService.ts**
```typescript
- setupWebhook(system, config): Configura webhook
- sendToExternalSystem(url, data, secret): Envia dados
- generateSignature(data, secret): Gera assinatura HMAC
- validateClienteSync(data): Valida dados de cliente
- syncCliente(id, systems): Sincroniza cliente específico
```

---

## 🧩 COMPONENTES

### Componentes UI Base (Shadcn/UI)

Localizados em `src/components/ui/`:

#### **Form Components**
- `button.tsx`: Botão base com variants
- `input.tsx`: Campo de entrada
- `select.tsx`: Seletor dropdown
- `calendar.tsx`: Componente de calendário
- `datepicker.tsx`: Seletor de data
- `form.tsx`: Sistema de formulários com validação

#### **Layout Components**
- `sidebar.tsx`: Barra lateral navegável
- `collapsible.tsx`: Seções expansíveis
- `aspect-ratio.tsx`: Controle de proporção

#### **Feedback Components**
- `toast.tsx`: Notificações temporárias
- `skeleton.tsx`: Loading states
- `use-toast.ts`: Hook para toasts

#### **Data Display**
- `table.tsx`: Tabelas responsivas
- `badge.tsx`: Etiquetas/badges
- `avatar.tsx`: Imagens de perfil

### Componentes de Teste

#### **SupabaseConnectionTest.tsx**
```typescript
- Testa conexão com Supabase
- Exibe status da conexão
- Valida configurações RLS
```

---

## 🎣 HOOKS E UTILS

### Custom Hooks

Embora não existam hooks customizados implementados atualmente, o sistema está preparado para receber hooks para:
- Gestão de estado local
- Integração com APIs
- Validação de formulários
- Cache de dados

### Utilitários

#### **currencyUtils.ts**
```typescript
- formatCurrency(value): Formata valor como moeda BRL
- parseCurrency(value): Converte string em número
```

#### **authUtils.ts**
```typescript
- createTestUser(email, password): Cria usuário de teste
- resetPassword(email): Reset de senha via email
```

#### **usuarioUtils.ts**
```typescript
- transformSupabaseToUsuario(item): Transforma dados Supabase
- validateUsuarioData(data): Valida dados de usuário
- getErrorMessage(error): Mensagens de erro amigáveis
```

#### **newTableTemplate.ts**
```typescript
- generateTableCreationSQL(): Template para novas tabelas
- newTableInstructions: Instruções para desenvolvimento
```

---

## 📝 TIPOS TYPESCRIPT

### Tipos Principais

#### **cliente.ts**
```typescript
interface Cliente {
  id?: string
  nome: string
  tipo: 'F' | 'J'
  cpfCnpj?: string
  emails?: string[]
  telefones?: string[]
  endereco?: Endereco
  dadosPessoais?: DadosPessoais // PF
  dadosEmpresa?: DadosEmpresa   // PJ
  contatos?: ContatoEmpresa[]   // PJ estruturado
  setor?: Setor
}
```

#### **contasPagar.ts**
```typescript
interface ContaPagar {
  id: string
  numero_documento: string
  fornecedor_id?: string
  valor_original: number
  situacao: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA'
  recorrente: boolean
  rateios?: RateioContaPagar[]
}
```

#### **contasBancarias.ts**
```typescript
interface ContaBancaria {
  id: string
  numero_conta: string
  titular: string
  saldo_atual: number
  conta_cofre: boolean // conta virtual interna
  agencia?: AgenciaInfo
}
```

#### **empresa.ts**
```typescript
interface EmpresaRepresentada {
  cnpj: string
  razaoSocial: string
  qualificacaoFiscal: QualificacaoFiscal
  configuracaoNF: ConfiguracaoNF
}

interface Usuario {
  empresaRepresentadaId: string
  perfilId: string
  colaboradorId?: string
}
```

#### **fiscal.ts**
```typescript
interface ConfiguracaoFiscal {
  ambiente: 'Teste' | 'Producao'
  regimeTributario: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  certificadoDigital?: string
}

interface CFOP {
  codigo: string
  destino: 'interno' | 'interestadual' | 'exterior'
  tipo: 'entrada' | 'saida'
}
```

### Dados Estáticos

#### **meiosComunicacao.ts**
- WhatsApp, E-mail, Telefone, SMS, Carta, Visita Pessoal

#### **estadosCivis.ts**
- Solteiro, Casado, Divorciado, Viúvo, União Estável, Separado

#### **formasAtuacao.ts**
- Matriz, Filial, Franquia, Representante, Distribuidor, Outros

---

## 🔗 INTEGRAÇÃO SUPABASE

### Configuração

#### **client.ts**
```typescript
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)
```

#### **types.ts**
- Tipos gerados automaticamente do schema Supabase
- Garante type-safety completo
- Atualizado automaticamente via CLI

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado com políticas:
```sql
CREATE POLICY "Permitir acesso total para usuários autenticados"
ON public.table_name
FOR ALL
USING (true)
WITH CHECK (true);
```

### Secrets Configurados
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## ⚙️ CONFIGURAÇÕES

### **vite.config.ts**
```typescript
- Configuração do Vite
- Alias para imports (@/)
- Plugins React
```

### **tailwind.config.ts**
```typescript
- Configuração Tailwind CSS
- Integração com Shadcn/UI
- Variáveis CSS customizadas
```

### **tsconfig.json**
```typescript
- Configuração TypeScript rigorosa
- Strict mode habilitado
- Path mapping configurado
```

### **package.json**
```typescript
dependencies:
- react: 18.x
- typescript: 5.x
- @supabase/supabase-js: 2.x
- @tanstack/react-query: 5.x
- tailwindcss: 3.x
- lucide-react: ícones
- date-fns: manipulação de datas
- react-hook-form: formulários
- zod: validação
```

---

## 🔄 FLUXOS DE DADOS

### Fluxo de Autenticação
1. Usuário acessa `/login`
2. Credenciais validadas via Supabase Auth
3. Token JWT armazenado no localStorage
4. RLS policies aplicadas automaticamente

### Fluxo de CRUD
1. Componente chama serviço
2. Serviço faz query Supabase
3. Dados transformados via utils
4. Estado atualizado via React Query
5. UI re-renderizada automaticamente

### Fluxo de Sincronização
1. Webhook recebido de sistema externo
2. Dados validados via `syncService`
3. Transformação para formato interno
4. Inserção/atualização via Supabase
5. Log de sincronização gravado

---

## 🚀 PRÓXIMOS PASSOS

### Implementações Pendentes
1. **Autenticação**: Sistema completo de login/logout
2. **Dashboard**: Tela principal com métricas
3. **Relatórios**: Módulo de relatórios financeiros
4. **API Integration**: Endpoints para integração externa
5. **Mobile**: Versão responsiva/PWA

### Melhorias Técnicas
1. **Testing**: Testes unitários e E2E
2. **Performance**: Code splitting e lazy loading
3. **Monitoring**: Logs e métricas de performance
4. **Documentation**: Storybook para componentes

---

## 📚 REFERÊNCIAS

- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Shadcn/UI Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Hook Form Docs](https://react-hook-form.com)

---

**Versão da Documentação**: 1.0  
**Última Atualização**: 08/01/2025  
**Sistema**: NOVUS ERP MODULAR  
**Status**: Em Desenvolvimento Ativo

