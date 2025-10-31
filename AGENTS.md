# Repository Guidelines

SizeHub targets a wardrobe intelligence tool; align every change with the shared plans while the codebase matures from the current planning documents.

## Project Structure & Module Organization
The monorepo spans `apps/web` (Next.js PWA), `apps/edge` (Supabase Edge Functions), `packages/db` (PostgreSQL DDL, seeds, RLS policies), and `packages/tests` (Playwright). Extend the nearest package when adding features, and move shared contracts to `packages/db` or the planned `packages/shared` workspace so web and edge stay aligned.

## Build, Test, and Development Commands
`pnpm` workspaces back the toolchain: `pnpm install`, `pnpm web:dev`, `pnpm edge:dev`, and `pnpm test:e2e`. Run Supabase locally with `supabase start` and sync schema changes via `supabase db push`. Keep `.env.local` aligned with secrets tracked in `BUILD_PLAN.md`.

## Coding Style & Naming Conventions
TypeScript stays strict with 2-space indentation and Prettier defaults. Components use PascalCase files, hooks start with `use`, and Zustand stores live in `/state`. SQL migrations follow timestamp prefixes and carry their RLS policies. Tailwind tokens must match the palette in `UI.md`; add tokens centrally, not inline.

## Testing Guidelines
Playwright owns PWA flows and unit suites cover edge utilities; mirror that split when adding tests. Name UI specs `{feature}.spec.ts` and edge tests `{module}.test.ts`. Run `pnpm --filter web lint` and `pnpm test:e2e` before pushing; attach Playwright traces if failures persist. Back schema shifts with SQL assertions or Supabase sandbox checks.

## Commit & Pull Request Guidelines
Write imperative commits (`feat: tighten trusted-circle gating`) grouped by feature. PRs need a concise changelog, UI evidence when visuals shift, and references to related tasks. Flag new Supabase migrations or secrets so reviewers can hydrate their envs. Draft PRs are fine while design feedback is pending.

## Security & Configuration Tips
Never commit live Stripe, Supabase, or Postmark keys—use `.env.example` placeholders. Document edge-function secrets alongside Supabase settings. Re-evaluate RLS after schema changes and regenerate clients before release. For public links or Secret Giver paths, verify TTL, max-view, and password logic.
