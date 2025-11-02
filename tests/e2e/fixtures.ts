import { test as base } from '@playwright/test';

export type AppFixtures = Record<string, never>;

export const test = base.extend<AppFixtures>({});
export const expect = test.expect;
