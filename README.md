# SizeSync Prototype

This repository contains the first working vertical slice for SizeSync: a Next.js PWA backed by Supabase and ready to deploy on Vercel. The goal is to prove the measurement-first flows described in `BUILD_PLAN.md` with a real database, server actions, and edge automation hooks.

## Prerequisites
- Node.js 20+
- [pnpm](https://pnpm.io/) (v9 or newer)
- [Supabase CLI](https://supabase.com/docs/guides/cli) authenticated against your Supabase account
- Optional: Docker (for local Supabase stack)

## Local development
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Duplicate `.env.example` into the environments you need (for example `.env.local` at repository root) and provide:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Start the Supabase stack and apply the schema:
   ```bash
   supabase start
   supabase db reset --seed
   ```
   The commands above run all migrations in `supabase/migrations` and seed demo data for the prototype profile.
4. Run the Next.js app:
   ```bash
   pnpm web:dev
   ```
   The dashboard renders demo measurements from Supabase and lets you insert new values through a server action.

## Testing & linting
- Lint: `pnpm --filter web lint`
- Playwright smoke test (requires the app to boot with valid env vars):
  ```bash
  pnpm test:e2e
  ```
  The Playwright config will start the Next.js dev server automatically. Ensure the Supabase stack is running before invoking the tests.

## Edge automation
`apps/edge` hosts TypeScript helpers that use the Supabase service role to refresh measurement summaries or run scheduled jobs. Build them with `pnpm edge:build`. The compiled output can be bundled as a Supabase Edge Function (see `supabase/config.toml` for local ports).

## Deployment (Vercel + Supabase)
1. **Supabase migrations (remote)**  
   If you cannot use `supabase link`, push migrations directly by pointing at the managed Postgres instance:
   ```bash
   supabase db push \
     --db-url "postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
     --include-all
   ```
   > Use the database password from `Settings → Database → Connection string`. Seed data is optional; if you skip it, create a profile through the app after signing up.
2. **Create the Vercel project**
   - Connect Vercel to the GitHub repository (root directory: `apps/web`).
   - Set install command `pnpm install`, build command `pnpm build`, output directory `.next`.
3. **Environment variables (Preview + Production)**
   - `NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
   - (Optional) `SUPABASE_URL` and `SUPABASE_DB_PASSWORD` if you need runtime admin access.
4. **Deploy**
   - Each push to the tracked branch triggers `pnpm build` (alias for `pnpm web:build`).
   - Verify that the app loads, you can create an account via Supabase Auth (email), and measurements persist.

## GitHub workflow
1. Inicjalizuj repozytorium (`git init`), dodaj zdalne połączenie do GitHuba i wykonaj pierwszy commit.
2. Przed każdym pushem uruchom lokalnie:
   ```bash
   pnpm lint
   pnpm build
   ```
   (W razie braku dostępu do Supabase możesz dodać zmienne środowiskowe bezpośrednio w komendzie tak, jak w sekcji powyżej.)
3. Push do gałęzi monitorowanej przez Vercel (np. `main`). Vercel automatycznie pobierze repozytorium i zbuduje projekt w trybie produkcyjnym.
4. Po udanym deploymencie sprawdź logi w Supabase (Auth + Database), aby upewnić się, że nowa wersja korzysta z właściwego środowiska.

For CI/CD you can wire `supabase db push` into a release pipeline or run it manually before deploying branches that change the schema.
