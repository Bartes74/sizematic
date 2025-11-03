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

function makeTestId() {
  return Date.now().toString(36);
}

test.describe('Wishlist editing flow', () => {
  test('user can edit and delete wishlist items from the dashboard', async ({ page }) => {
    await login(page);

    const unique = makeTestId();
    const productUrl = `https://example.com/playwright-${unique}`;
    const productName = `Playwright produkt ${unique}`;
    const productBrand = `Playwright marka ${unique}`;
    const originalNotes = `Playwright notatka ${unique}`;
    const updatedNotes = `Playwright zaktualizowana notatka ${unique}`;

    await page.goto('/dashboard/wishlists');

    await page.getByLabel(/link do sklepu/i).fill(productUrl);
    await page.getByLabel(/nazwa produktu/i).fill(productName);
    await page.getByLabel(/sklep \/ marka/i).fill(productBrand);
    await page.getByLabel(/opis/i).fill(originalNotes);
    await page.getByRole('button', { name: /dodaj do listy/i }).click();

    await expect(page.getByLabel(/link do sklepu/i)).toHaveValue('', { timeout: 15000 });

    await page.goto('/dashboard');

    const card = page
      .locator('[data-testid="wishlist-card"]', {
        has: page.getByText(productName, { exact: true }),
      })
      .first();

    await expect(card).toBeVisible({ timeout: 15000 });

    await card.getByTestId('wishlist-card-edit').click();

    await page.waitForURL(/\/dashboard\/wishlists\?edit=/, { timeout: 15000 });

    await expect(page.locator('#wishlist-name')).toHaveValue(productName, { timeout: 15000 });
    await expect(page.locator('#wishlist-brand')).toHaveValue(productBrand);
    await expect(page.locator('#wishlist-notes')).toHaveValue(originalNotes);

    await page.locator('#wishlist-notes').fill(updatedNotes);
    await page.getByRole('button', { name: /zapisz/i }).click();

    await page.waitForURL('/dashboard/wishlists', { timeout: 15000 });

    await page.goto('/dashboard');

    const updatedCard = page
      .locator('[data-testid="wishlist-card"]', {
        has: page.getByText(productName, { exact: true }),
      })
      .first();

    await expect(updatedCard).toBeVisible({ timeout: 15000 });

    await updatedCard.getByTestId('wishlist-card-delete').click();

    const deleteModal = page.getByRole('dialog');
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.getByText(productName)).toBeVisible();

    await deleteModal.getByRole('button', { name: /usuń/i }).click();

    await expect(deleteModal).toBeHidden({ timeout: 15000 });
    await expect(updatedCard).toHaveCount(0);
  });
});
