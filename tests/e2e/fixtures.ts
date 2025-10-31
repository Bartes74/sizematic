import { test as base } from '@playwright/test';

export type AppFixtures = {
  // future fixtures (e.g., loggedInPage) trafią tutaj
};

export const test = base.extend<AppFixtures>({});
export const expect = test.expect;
