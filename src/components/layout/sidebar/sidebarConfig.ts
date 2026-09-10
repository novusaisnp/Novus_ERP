
import {
  Calendar,
  Home,
  Inbox,
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  FileText,
  Users,
  Settings,
  RefreshCw,
  CreditCard,
  Factory,
} from "lucide-react"

export interface MenuItem {
  title: string;
  url?: string;
  icon: any;
  items?: { title: string; url: string }[];
}

export const sidebarItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Cadastros",
    icon: Inbox,
    items: [
      {
        title: "Entidades",
        url: "/cadastros/entidades",
      },
      {
        title: "Clientes",
        url: "/cadastros/clientes",
      },
      {
        title: "Fornecedores", 
        url: "/cadastros/fornecedores",
      },
      {
        title: "Serviços",
        url: "/cadastros/servicos",
      },
    ],
  },
  {
    title: "Estoque",
    icon: Package,
    items: [
      {
        title: "Produtos",
        url: "/estoque/produtos",
      },
      {
        title: "Categorias",
        url: "/estoque/categorias",
      },
      {
        title: "Localizações",
        url: "/estoque/localizacoes",
      },
      {
        title: "Unidades de Medida",
        url: "/estoque/unidades-medida",
      },
      {
        title: "Tamanhos",
        url: "/estoque/tamanhos",
      },
      {
        title: "Movimentações",
        url: "/estoque/movimentacoes",
      },
      {
        title: "Inventário",
        url: "/estoque/inventario",
      },
      {
        title: "Relatórios",
        url: "/estoque/relatorios",
      },
    ],
  },
  {
    title: "Vendas",
    icon: ShoppingCart,
    items: [
      {
        title: "Pedidos",
        url: "/vendas/pedidos",
      },
      {
        title: "Orçamentos",
        url: "/vendas/orcamentos",
      },
      {
        title: "Contratos",
        url: "/vendas/contratos",
      },
      {
        title: "Relatórios",
        url: "/vendas/relatorios",
      },
    ],
  },
  {
    title: "Compras",
    icon: Truck,
    items: [
      {
        title: "Requisições",
        url: "/compras/requisicoes",
      },
      {
        title: "Cotações",
        url: "/compras/cotacoes",
      },
      {
        title: "Pedidos",
        url: "/compras/pedidos",
      },
    ],
  },
  {
    title: "Produção",
    icon: Factory,
    items: [
      {
        title: "Fichas Técnicas",
        url: "/producao/fichas-tecnicas",
      },
      {
        title: "Ordens de Fabricação",
        url: "/producao/ordens",
      },
    ],
  },
  {
    title: "Gestão Bancária",
    icon: CreditCard,
    items: [
      {
        title: "Bancos",
        url: "/gestao-bancaria/bancos",
      },
      {
        title: "Agências",
        url: "/gestao-bancaria/agencias",
      },
      {
        title: "Contas Bancárias",
        url: "/gestao-bancaria/contas-bancarias",
      },
      {
        title: "Movimentações Bancárias",
        url: "/gestao-bancaria/movimentacoes-bancarias",
      },
      {
        title: "Conciliação",
        url: "/gestao-bancaria/conciliacao",
      },
    ],
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    items: [
      {
        title: "Contas a Receber",
        url: "/financeiro/contas-receber",
      },
      {
        title: "Contas a Pagar",
        url: "/financeiro/contas-pagar",
      },
      {
        title: "Movimentações Financeiras",
        url: "/financeiro/movimentacoes",
      },
      {
        title: "Fluxo de Caixa",
        url: "/financeiro/fluxo-caixa",
      },
      {
        title: "Fluxo por Competência",
        url: "/financeiro/fluxo-competencia",
      },
      {
        title: "Centro de Custos",
        url: "/financeiro/centros-custo",
      },
      {
        title: "Plano de Contas",
        url: "/financeiro/plano-contas",
      },
      {
        title: "Ativos Fixos",
        url: "/financeiro/ativos-fixos",
      },
      {
        title: "Central de Aprovações",
        url: "/financeiro/aprovacoes",
      },
      {
        title: "Alçadas de Aprovação",
        url: "/financeiro/alcadas",
      },
      {
        title: "Configurações Básicas",
        url: "/financeiro/config-basicas",
      },
      {
        title: "Relatórios",
        url: "/financeiro/relatorios",
      },
    ],
  },
  {
    title: "Fiscal",
    icon: FileText,
    items: [
      {
        title: "Dashboard Fiscal",
        url: "/fiscal/dashboard",
      },
      {
        title: "Notas Fiscais",
        url: "/fiscal/notas-fiscais",
      },
      {
        title: "MDF-e",
        url: "/fiscal/mdfe",
      },
      {
        title: "SPED",
        url: "/fiscal/sped",
      },
      {
        title: "Tributos",
        url: "/fiscal/tributos",
      },
    ],
  },
  {
    title: "RH",
    icon: Users,
    items: [
      {
        title: "Colaboradores",
        url: "/rh/colaboradores",
      },
      {
        title: "Cargos",
        url: "/rh/cargos",
      },
      {
        title: "Departamentos",
        url: "/rh/departamentos",
      },
      {
        title: "Folha de Pagamento",
        url: "/rh/folha/folha-pagamento",
      },
      {
        title: "Vencimentos Padrão",
        url: "/rh/folha/vencimentos-padrao",
      },
      {
        title: "Descontos Padrão",
        url: "/rh/folha/descontos-padrao",
      },
      {
        title: "Benefícios Vinculados",
        url: "/rh/folha/beneficios-vinculados",
      },
      {
        title: "Integração de Ponto",
        url: "/rh/folha/integracao-ponto",
      },
      {
        title: "Registros de Ponto",
        url: "/rh/registros-ponto",
      },
      {
        title: "Relatórios",
        url: "/rh/relatorios",
      },
    ],
  },
  {
    title: "Integração",
    icon: RefreshCw,
    items: [
      {
        title: "Sincronização",
        url: "/integracao/sincronizacao",
      },
    ],
  },
  {
    title: "Configurações",
    icon: Settings,
    items: [
      {
        title: "Empresas",
        url: "/configuracoes/empresas",
      },
      {
        title: "Usuários",
        url: "/configuracoes/usuarios",
      },
      {
        title: "Webhooks",
        url: "/configuracoes/webhooks",
      },
      {
        title: "Campos personalizados",
        url: "/configuracoes/campos-personalizados",
      },
      {
        title: "Regras de classificação de receita",
        url: "/configuracoes/regras-classificacao-receita",
      },
      {
        // P6.1: admin-only. Filtrado em sidebarVisibility quando isAdmin=false.
        title: "Relatórios (Ops)",
        url: "/configuracoes/relatorios-ops",
      },
    ],
  },
];
