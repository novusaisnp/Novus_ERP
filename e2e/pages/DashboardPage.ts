import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly userDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.getByRole('navigation').first();
    this.userDropdown = page
      .locator('[data-testid="user-dropdown"]')
      .or(page.getByRole('button', { name: /@/ }));
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.sidebar).toBeVisible();
  }

  /**
   * A sidebar não usa links — todo item é um <button>. Grupos (ex. "Vendas") só
   * abrem/expandem ao clicar, e os sub-itens só entram no DOM com a sidebar em
   * hover (largura expandida) E o grupo aberto (Radix Collapsible desmonta o
   * conteúdo quando fechado). Navegar para um item de grupo exige: hover na
   * sidebar, clicar no botão do grupo, depois clicar no botão do sub-item.
   */
  async navigateTo(groupTitle: string, subItemTitle: string, expectedUrl: RegExp): Promise<void> {
    await this.sidebar.hover();
    await this.sidebar.getByRole('button', { name: groupTitle, exact: true }).click();
    await this.page.getByRole('button', { name: subItemTitle, exact: true }).click();
    await expect(this.page).toHaveURL(expectedUrl, { timeout: 10_000 });
  }

  /** Para itens de topo sem grupo (ex. "Dashboard"), sem sub-item para clicar. */
  async navigateToTopLevel(title: string, expectedUrl: RegExp): Promise<void> {
    await this.sidebar.getByRole('button', { name: title, exact: true }).first().click();
    await expect(this.page).toHaveURL(expectedUrl, { timeout: 10_000 });
  }

  async logout(): Promise<void> {
    await this.userDropdown.first().click();
    await this.page.getByRole('menuitem', { name: /sair|logout/i }).click();
    await expect(this.page).toHaveURL(/\/login/, { timeout: 10_000 });
  }
}
