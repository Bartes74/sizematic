import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_WISHLIST_EMAIL;
const TEST_PASSWORD = process.env.E2E_WISHLIST_PASSWORD;

async function login(page: import('@playwright/test').Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    test.skip(true, 'E2E_WISHLIST_EMAIL and E2E_WISHLIST_PASSWORD must be set for wishlist tests.');
  }

  await page.goto('/auth/login');
  await page.fill('input[type="email"]', TEST_EMAIL!);
  await page.fill('input[type="password"]', TEST_PASSWORD!);
  await page.getByRole('button', { name: /zaloguj się/i }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Wishlist dashboard', () => {
  test('owner can add wishlist item and see it immediately', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard/wishlists');

    const category = `Akcesoria ${Date.now()}`;
    const notes = 'Test item added via Playwright';
    const productUrl = 'https://example.com/';

    await page.getByLabel(/kategoria/i).fill(category);
    await page.getByLabel(/link do sklepu/i).fill(productUrl);
    await page.getByLabel(/opis/i).fill(notes);
    await page.getByRole('button', { name: /dodaj do listy/i }).click();

    await expect(page.getByText('Dodaj do listy', { exact: true })).not.toBeDisabled({ timeout: 15000 });

    await expect(page.getByText(category)).toBeVisible();
    await expect(page.getByText(/Produkt z listy marzeń|Nowy produkt/i).first()).toBeVisible();
  });

  test('share modal generates a link and allows copying', async ({ page }) => {
    await login(page);

    await page.goto('/dashboard/wishlists');

    await page.getByRole('button', { name: /udostępnij listę/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/generating link|link publiczny/i)).toBeVisible();
    await expect(modal.getByLabel(/link/i)).toHaveValue(/https?:\/\//i, { timeout: 15000 });

    await modal.getByRole('button', { name: /copy link|kopiuj link/i }).click();
    await expect(modal.getByRole('button', { name: /copied|skopiowano/i })).toBeVisible();

    await modal.getByRole('button', { name: /close|zamknij/i }).click();
    await expect(modal).toBeHidden();
  });
});

test.describe('Public wishlist view', () => {
  test('store link emits telemetry beacon before navigation', async ({ context, page }) => {
    const publicToken = process.env.E2E_WISHLIST_PUBLIC_TOKEN;

    test.skip(!publicToken, 'E2E_WISHLIST_PUBLIC_TOKEN must be configured for public wishlist test.');

    await page.route('/api/v1/wishlist-events', async (route, request) => {
      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        expect(body.eventType).toBe('wishlist_store_click');
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.fallback();
    });

    await page.goto(`/public/wishlists/${publicToken}`);

    const storeLink = page.getByRole('link', { name: /przejdź do sklepu/i }).first();
    await expect(storeLink).toBeVisible();

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      storeLink.click(),
    ]);

    await popup.close();
  });
});

