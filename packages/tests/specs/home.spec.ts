import { test, expect } from "@playwright/test";

const selectors = {
  heading: "h2:has-text('Zapisane pomiary')",
  formHeading: "text=Dodaj nowy pomiar"
};

test.describe("Measurement dashboard", () => {
  test("renders summary and form", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(selectors.heading)).toBeVisible();
    await expect(page.locator(selectors.formHeading)).toBeVisible();
  });
});
