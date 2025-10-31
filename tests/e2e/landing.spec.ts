import { test, expect } from './fixtures';

const HERO_HEADING_PL = 'Z GiftFit trafisz z rozmiarem za każdym razem!';
const LOGIN_BUTTON_PL = 'Zaloguj się';
const LOGIN_FORM_HEADING_PL = 'Zaloguj się';

test.describe('Landing page', () => {
  test('renders hero and opens login modal', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: HERO_HEADING_PL })).toBeVisible();

    await page.getByRole('button', { name: LOGIN_BUTTON_PL }).click();

    await expect(page.getByRole('heading', { name: LOGIN_FORM_HEADING_PL })).toBeVisible();
  });
});
