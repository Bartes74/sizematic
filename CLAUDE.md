# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SizeSync is an offline-first PWA for wardrobe size management built with Next.js and Supabase. The project implements a measurement-first approach using the EN 13402 standard, with automatic brand size conversions, trust circles for sharing, Secret Giver (paid temporary access), and gift links.

**Current Status**: Early vertical slice implementation. The backend schema, RLS policies, and basic measurement flows are in place. Most features described in BUILD_PLAN.md are planned but not yet implemented.

## Development Commands

### Setup
```bash
pnpm install
```

Duplicate `.env.example` to `.env.local` and provide:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Local Supabase
```bash
supabase start              # Start local stack (requires Docker)
supabase db reset --seed    # Apply migrations and seed data
supabase db push            # Push schema changes only
```

### Development Servers
```bash
pnpm web:dev     # Next.js dev server at http://localhost:3000
pnpm edge:dev    # Watch mode for edge functions
pnpm dev         # Alias for web:dev
```

### Build & Test
```bash
pnpm web:build           # Production build
pnpm --filter web lint   # Lint web app
pnpm test:e2e           # Playwright tests (requires Supabase running)
```

## Architecture

### Monorepo Structure
- `apps/web` — Next.js 15 PWA with React Server Components, Server Actions, Tailwind 4
- `apps/edge` — Supabase Edge Functions (TypeScript) for webhooks and scheduled jobs
- `packages/db` — SQL migrations, RLS policies, type definitions
- `packages/tests` — Playwright E2E tests
- `supabase/` — Supabase configuration and migrations

### Technology Stack
- **Frontend**: Next.js 15 + React 19, Server Actions for mutations, Tailwind 4
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Realtime)
- **Payments**: Stripe (planned for Secret Giver tokens and subscriptions)
- **Notifications**: FCM for push, Postmark/SendGrid for email (planned)
- **Testing**: Playwright for E2E flows

### Data Flow Patterns
- Server Actions (`apps/web/src/app/actions.ts`) handle mutations and call Supabase
- Server Components fetch data directly from Supabase using `@supabase/ssr`
- RLS policies enforce all access control at the database level
- Edge Functions use service role for privileged operations (gift links, webhooks)

## Key Implementation Notes

### Database & RLS
- **All tables have RLS enabled** — policies are defined inline with migrations
- Schema lives in `supabase/migrations/` with timestamp prefixes (e.g., `20250204120000_init.sql`)
- Current schema: `profiles`, `measurements`, `measurement_summaries` with automatic aggregation triggers
- Planned tables in BUILD_PLAN.md: `brands`, `brand_size_maps`, `trust_circles`, `share_rules`, `shared_links`, `secret_giver_requests`, `missions`, etc.

### Measurement System (ZPR)
- EN 13402 standard for body measurements
- Values stored in centimeters (`value_cm` column) for consistency
- User preference (`unit_pref` in profiles) controls display only
- Automatic summaries via trigger (`refresh_measurement_summary()`)

### Authentication & Authorization
- Supabase Auth manages users (email-based in local dev)
- RLS policies check `auth.uid()` against `profiles.owner_id`
- Future: Share rules will extend SELECT policies to allow trust circle members and Secret Giver requesters

### Offline-First Strategy
Planned (not yet implemented):
- IndexedDB cache via Dexie for domain models (profiles, measurements, brands, size maps)
- Mutation queue for offline edits with last-write-wins conflict resolution
- Operations requiring network (Secret Giver, gift links, payments) explicitly blocked offline

### Gift Links & Secret Giver
From BUILD_PLAN.md (not yet implemented):
- **Gift Links**: Public shareable links with TTL, max views, one-time mode, password protection (Plus plan)
- **Secret Giver**: Paid token (20 PLN via Stripe) grants temporary category access after approval
- Both use Edge Functions with service role to bypass RLS for public access

## Development Workflow

### Making Schema Changes
1. Create new migration: manually add timestamped file to `supabase/migrations/`
2. Include RLS policies inline with table definitions
3. Test locally: `supabase db reset --seed`
4. Push to remote: `supabase db push --db-url "postgresql://..."`

### Adding Features
1. Check BUILD_PLAN.md for architecture decisions and constraints
2. Extend nearest package (web/edge/db) following existing patterns
3. Move shared types to `packages/db/src/` for cross-package use
4. Update RLS policies if data access patterns change
5. Add Playwright test in `packages/tests/` for user-facing flows

### Testing RLS Policies
Create test cases for:
- Owner can read/write their own data
- Circle members can read shared categories (when implemented)
- SG requesters see only approved category data during valid window
- Public/anonymous users get 403 on direct table access

### Deployment
Vercel hosts the web app:
- Root directory: `apps/web`
- Install: `pnpm install`
- Build: `pnpm build`
- Output: `.next`

Environment variables must match local `.env.local` structure.

## Code Style

### TypeScript
- Strict mode enabled in `tsconfig.base.json`
- 2-space indentation (Prettier defaults)
- Component files: PascalCase (e.g., `MeasurementForm.tsx`)
- Hooks: `use` prefix (e.g., `useSupabaseClient.ts`)

### SQL
- Migrations: timestamp prefix + descriptive name
- RLS policies: defined inline after table creation
- Triggers: prefix with `trg_`, functions with `public.`

### Styling
- Tailwind 4 with CSS variables
- Design tokens reference UI.md (when adding global tokens)
- Avoid inline arbitrary values; prefer theme extensions

## Important Files

- `BUILD_PLAN.md` — Complete technical specification (MVP scope, data model, API contracts, RLS, phases)
- `AGENTS.md` — AI agent guidelines (likely development workflow notes)
- `README.md` — Setup instructions and deployment guide
- `UI.md` — UI/UX specifications and design system
- `SUPABASE_CHECKLIST.md` — Supabase-specific setup tasks

## Feature Implementation Phases (from BUILD_PLAN.md)

**Phase 0 (T-2w)**: Repository, CI, DDL, RLS basics, Edge helpers, provider setup
**Phase 1 (T0-T+4w)**: ZPR (measurements/labels/history), brand conversions, offline queue
**Phase 2 (T+4-T+6w)**: Trust circles, share rules, gift links
**Phase 3 (T+6-T+8w)**: Stripe integration, Secret Giver flows, privacy blocks
**Phase 4 (T+8-T+10w)**: Contextual notifications (CRON), micro-missions, weekly digest
**Phase 5 (T+10-T+14w)**: Security hardening, GDPR compliance, performance optimization

Current implementation is early Phase 1.

## Common Patterns

### Server Actions
```typescript
// apps/web/src/app/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function addMeasurement(formData: FormData) {
  const supabase = await createClient()
  // RLS enforces ownership
  const { data, error } = await supabase.from('measurements').insert(...)
}
```

### Server Components
```typescript
// Fetch directly in RSC
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('measurements').select('*')
  return <div>{/* render */}</div>
}
```

### Edge Functions
When implementing, place in `apps/edge/src/` with service role client for privileged operations.

## Security Considerations

- Never commit Stripe, Supabase, or email provider keys
- Use `.env.example` as template
- Regenerate types after schema changes: `pnpm --filter @sizematic/db generate` (when implemented)
- Test RLS policies after every schema migration
- Gift links and Secret Giver endpoints need rate limiting (see BUILD_PLAN.md §9)
- Public link access MUST go through Edge Functions, never direct SELECT grants

## References

When implementing features, consult BUILD_PLAN.md sections:
- §3: Full data model (tables, enums, indexes, foreign keys)
- §4: RLS policy patterns for each table
- §5: Domain algorithms (brand conversions, plan limits, notification rules)
- §6: API contracts (endpoints, request/response schemas, OpenAPI spec)
- §10: Testing requirements (unit, integration, E2E scenarios)
