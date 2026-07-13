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

  linkFor(nome: string | RegExp): Locator {
    return this.page.getByRole('link', { name: nome });
  }

  async navigateTo(nome: string | RegExp, expectedUrl: RegExp): Promise<void> {
    await this.linkFor(nome).first().click();
    await expect(this.page).toHaveURL(expectedUrl, { timeout: 10_000 });
  }

  async logout(): Promise<void> {
    await this.userDropdown.first().click();
    await this.page.getByRole('menuitem', { name: /sair|logout/i }).click();
    await expect(this.page).toHaveURL(/\/login/, { timeout: 10_000 });
  }
}
