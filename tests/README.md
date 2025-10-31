# Testy End-to-End (Playwright)

## Wymagania
- `pnpm install`
- Zmienna `PLAYWRIGHT_BASE_URL` wskazująca na uruchomioną aplikację (domyślnie `http://localhost:3000`).
- (Opcjonalnie) `PLAYWRIGHT_TEST_EMAIL` i `PLAYWRIGHT_TEST_PASSWORD` – wykorzystamy w kolejnych scenariuszach wymagających logowania.

## Uruchomienie lokalne
```bash
pnpm test:e2e
```

## Integracja z Playwright MCP
1. Upewnij się, że serwer testowy działa (np. `pnpm dev`).
2. Uruchom `playwright-mcp` (np. `npx playwright-mcp` w katalogu projektu).
3. Korzystaj z dostępnych komend MCP (`init-browser`, `get-context`, `get-screenshot`) w trakcie pisania/debugowania testów.

## Aktualne scenariusze
- `tests/e2e/landing.spec.ts` – smoke test landing page (hero + modal logowania).

Kolejne testy (dashboard, quick sizes, missions) oznaczone są jako TODO w `tests/TEST_PLAN.md`.
