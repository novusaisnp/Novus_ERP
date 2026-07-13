import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly userDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.getByRole('navigation');
    this.userDropdown = page.locator('[data-testid="user-dropdown"]').or(page.getByRole('button', { name: /@/ }));
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  linkFor(nome: string | RegExp): Locator {
    return this.page.getByRole('link', { name: nome });
  }
}
