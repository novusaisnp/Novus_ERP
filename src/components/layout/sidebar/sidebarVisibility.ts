// SM1-D: Filtra itens do sidebar segundo feature flags e role admin
// Módulos fora do go-live inicial ficam ocultos até serem ligados via env.

import { featureFlags } from '@/lib/featureFlags';
import { sidebarItems, MenuItem } from './sidebarConfig';

interface Options {
  isAdmin: boolean;
}

const ESTOQUE_CORE = new Set([
  '/estoque/produtos',
  '/estoque/categorias',
]);

export const getVisibleSidebarItems = ({ isAdmin }: Options): MenuItem[] => {
  const items: MenuItem[] = [];

  for (const group of sidebarItems) {
    // Fiscal → Dashboard Fiscal: admin-only
    if (group.title === 'Fiscal' && group.items) {
      const filtered = group.items.filter((sub) =>
        sub.url === '/fiscal/dashboard' ? isAdmin : true,
      );
      items.push({ ...group, items: filtered });
      continue;
    }

    // Integração/Sync: admin-only + flag
    if (group.title === 'Integração') {
      if (!isAdmin || !featureFlags.syncDashboard) continue;
    }

    // Configurações → Relatórios (Ops) / Campos personalizados / Webhooks: admin-only.
    // Webhooks entrou na Fase 6 (AUDITORIA_NOVA) — gerencia o secret_token HMAC,
    // agora admin-only também na RLS, não só na rota.
    if (group.title === 'Configurações' && group.items) {
      const filtered = group.items.filter((sub) => {
        if (sub.url === '/configuracoes/relatorios-ops') return isAdmin;
        if (sub.url === '/configuracoes/campos-personalizados') return isAdmin;
        if (sub.url === '/configuracoes/webhooks') return isAdmin;
        return true;
      });
      items.push({ ...group, items: filtered });
      continue;
    }

    // RH → Folha de Pagamento: admin-only (Fase 6 — salário, mesma lógica de webhooks).
    if (group.title === 'RH' && group.items) {
      const filtered = group.items.filter((sub) =>
        sub.url === '/rh/folha/folha-pagamento' ? isAdmin : true,
      );
      items.push({ ...group, items: filtered });
      continue;
    }

    // Estoque: manter só Produtos/Categorias; extras exigem flag
    if (group.title === 'Estoque' && group.items) {
      const filtered = featureFlags.estoqueExt
        ? group.items
        : group.items.filter((sub) => ESTOQUE_CORE.has(sub.url));
      items.push({ ...group, items: filtered });
      continue;
    }

    items.push(group);
  }

  return items;
};
