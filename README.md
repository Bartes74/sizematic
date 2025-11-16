# GiftFit (SizeHub) — Developer Documentation

GiftFit (roboczo SizeHub) to PWA zbudowana na Next.js 15 i Supabase, która pomaga użytkownikom zarządzać rozmiarami, udostępniać je zaufanym osobom oraz kompletować listę prezentów. Niniejszy dokument podsumowuje architekturę, kluczowe funkcjonalności oraz procesy developerskie projektów `apps/web`, `apps/edge` i `supabase`.

## ⚠️ WAŻNE: Rejestracja na Produkcji

**Jeśli rejestracja użytkowników nie działa na https://gift.fit:**

👉 **[Szybka naprawa (5 minut)](./docs/SZYBKA_NAPRAWA.md)**

📋 **[Szczegółowy przewodnik](./docs/FIX_PRODUCTION_REGISTRATION.md)**

✅ **[Checklist krok po kroku](./docs/CHECKLIST_NAPRAWA_REJESTRACJI.md)**

**TL;DR**: Dodaj redirect URLs w Supabase Dashboard i ustaw `NEXT_PUBLIC_SITE_URL` w Vercel Production.

---

## Spis treści
1. [Szybki start](#szybki-start)
2. [Przegląd funkcjonalny](#przegląd-funkcjonalny)
3. [Architektura i technologia](#architektura-i-technologia)
4. [Supabase – tabele i RLS](#supabase--tabele-i-rls)
5. [Praca lokalna](#praca-lokalna)
6. [Testy i jakość](#testy-i-jakość)
7. [Deploy na Vercel](#deploy-na-vercel)
8. [Przydatne skrypty i narzędzia](#przydatne-skrypty-i-narzędzia)
9. [Dalsza dokumentacja](#dalsza-dokumentacja)

## Szybki start
- **Wymagania:** Node.js 20+, pnpm ≥ 9, Supabase CLI zalogowane do projektu, opcjonalnie Docker (lokalny Supabase stack).
- **Instalacja zależności:** `pnpm install`
- **Konfiguracja środowiska:** skopiuj `.env.example` do `.env.local` i uzupełnij:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Baza danych lokalnie:**
  ```bash
  supabase start
  supabase db reset --seed
  ```
- **Uruchomienie aplikacji:** `pnpm web:dev` (domyślnie na http://localhost:3000)

## Przegląd funkcjonalny
### Landing page & marketing
- Marketing Shell z nagłówkiem i stopką współdzielonymi w całym serwisie.
- Sekcje opisujące wartości GiftFit („Twój prywatny katalog rozmiarów”, „Prezenty, które zawsze pasują”).
- Strony prawne (`/privacy`, `/terms`) i modal kontaktowy wysyłający wiadomości do `bartes7@gmail.com`.

### Dashboard (apps/web/src/app/dashboard)
- **Fill in Your Data Gaps** – kafelki pomiarów ciała zgodne z `wymiary_ciala.md`, modale z opisem „Po co?” / „Jak mierzyć?”.
- **Lista marzeń** – podgląd ostatnich pozycji z przyciskami `Edytuj` i `Usuń`, odświeżanie po akcji oraz modal potwierdzający usunięcie.
- **Zdarzenia i prezenty** – odświeżany kalendarz z szeroką taśmą kart, liczniki „dni do wydarzenia”, możliwość dodawania/edycji z uczestnikami.
- **Rozmiary i pomiary** – integracja z tabelami `body_measurements`, `garments`, `size_labels`.

### Lista marzeń (`/dashboard/wishlists`)
- Formularz dodawania produktu (URL, nazwa, marka, cena, zdjęcie, notatki) z opcjonalnym pobieraniem metadanych.
- Obsługa edycji z automatycznym wypełnieniem pól (`?edit=<itemId>`), aktualizacją notatek oraz blokadą pól źródłowych.
- Usuwanie przez API z wykorzystaniem Supabase Admin Client, aby obejść RLS.
- Publiczne udostępnianie list i pojedynczych produktów (`/public/wishlists/*`).

### Krąg zaufanych i Secret Giver
- Przegląd połączeń, zaproszenia do kręgu oraz konfiguracja uprawnień według kategorii produktu.
- Telemetria i eventy katalogowane w `wishlist_event_logs` oraz CRON `refresh_stale_wishlist_metadata`.

## Architektura i technologia
- **Backend**: Supabase (Postgres + Auth + pg_cron). Wszystkie tabele mają włączone RLS, a operacje administracyjne realizujemy przez `createSupabaseAdminClient`.
- **Frontend**: Next.js 15 (App Router, React 19), Tailwind CSS 4, `next-intl` (pl/en), Server Actions (`src/app/actions.ts`).
- **Edge**: `apps/edge` (TypeScript) – narzędzia do odświeżania metadanych, webhooków, Secret Giver itp.
- **Biblioteki**: Zustand (wybrane stany), Playwright (E2E), ESLint + TypeScript strict.

## Supabase – tabele i RLS
| Tabela | Przeznaczenie | Kluczowe pola | RLS / uwagi |
| --- | --- | --- | --- |
| `profiles` | podstawowy profil użytkownika | `owner_id`, `display_name`, `unit_pref` | `owner_id = auth.uid()` |
| `body_measurements` | pomiary ciała | `profile_id`, `value_cm`, `definition` | insert/update tylko właściciel |
| `garments` & `size_labels` | zapis rozmiarów ubrań / metek | `profile_id`, `category`, `size` | właściciel, plan Premium rozszerza widoki |
| `wishlist_items` | lista marzeń | `wishlist_id`, `product_name`, `price_snapshot` | standardowo RLS blokuje insert/patch/delete → API korzysta z Admin Client |
| `wishlist_public_links` | linki publiczne do list | `hash`, `expires_at`, `usage_count` | dostęp tylko przez funkcje edge |
| `dashboard_events` | wydarzenia w kalendarzu | `owner_id`, `title`, `event_date`, `participants` | row-level owner + cron seeds |
| `wishlist_event_logs` | telemetry kliknięć / akcji | `event_type`, `payload` | insert przez service role |

Dodatkowe szczegóły architektury, RLS i roadmapy znajdziesz w [`BUILD_PLAN.md`](BUILD_PLAN.md) oraz [`SUPABASE_CHECKLIST.md`](SUPABASE_CHECKLIST.md).

## Praca lokalna
1. **Instalacja i konfiguracja** – patrz [Szybki start](#szybki-start).
2. **Debug RLS** – jeśli napotkasz 403 w Supabase, rozważ użycie `createSupabaseAdminClient` lub sprawdź polityki w migracjach `supabase/migrations/*`.
3. **Seed/test data** – `supabase db reset --seed` tworzy profil demo z listą marzeń; dodatkowe konta testowe w `scripts/create-test-users.sh`.
4. **CLI w projekcie** – `pnpm web:dev`, `pnpm web:build`, `pnpm edge:dev`, `pnpm lint`, `pnpm test:e2e`.

## Testy i jakość
### Lint & TypeScript
- `pnpm --filter web lint` – ESLint + type-check.

### Playwright
- Konfiguracja w `playwright.config.ts` (testy w katalogu `tests/e2e`).
- Wymagane zmienne środowiskowe:
  - `E2E_WISHLIST_EMAIL` / `E2E_WISHLIST_PASSWORD` – konto z dostępem do dashboardu.
  - (Opcjonalnie) `E2E_WISHLIST_PUBLIC_TOKEN` – do testów widoku publicznego.
- Uruchomienie kompletu testów: `pnpm test:e2e`.
- Najważniejsze scenariusze:
  - `landing.spec.ts` – smoke test landing page.
  - `wishlist.spec.ts` – dodawanie pozycji, generowanie linków.
  - **`wishlist-edit.spec.ts`** – nowy test obejmujący edycję i usuwanie pozycji z poziomu dashboardu (przycisk `Edytuj` oraz modal potwierdzenia).

### Manual QA checklist (skrót)
- Dodanie/edycja/usunięcie pozycji na liście marzeń.
- Wypełnienie brakujących pomiarów ciała i zniknięcie sekcji „Fill in Your Data Gaps”.
- Dodanie wydarzenia w kalendarzu i odświeżenie taśmy.
- Wysłanie formularza kontaktowego (lokalnie zweryfikuj logi API `/api/contact`).

## Deploy na Vercel
1. **Supabase** – przed publikacją wypchnij migracje: `supabase db push --db-url ...`.
2. **Vercel** – projekt wskazuje na `apps/web`, komendy: `pnpm install` / `pnpm build`, output `.next`.
3. **Zmienne środowiskowe** – ustaw supabase URL/klucze w `Production` i `Preview`; ewentualnie dodaj `E2E_*` do preview, aby odpalać testy w pipeline.
4. **Proces** – każdy push na `main` uruchamia build na Vercelu; monitoruj logi oraz metryki w Supabase (Auth/DB/Functions).

## Przydatne skrypty i narzędzia
- `scripts/create-demo-user.mjs` – szybkie założenie konta demo przez Supabase Admin API.
- `scripts/create-test-users.sh` – helper dla Playwrighta (tworzy użytkowników testowych).
- `apps/edge/*` – funkcje do CRON (np. automatyczne odświeżanie metadanych produktów).

## Dalsza dokumentacja
- [`BUILD_PLAN.md`](BUILD_PLAN.md) – pełna roadmapa i plan wdrożenia (fazowanie funkcji).
- [`UI.md`](UI.md) – wytyczne UI/Tailwind, kolorystyka (#48A9A6 jako primary).
- [`drzewo_produktow.md`](drzewo_produktow.md) – struktura formularzy rozmiarów.
- [`SUPABASE_CHECKLIST.md`](SUPABASE_CHECKLIST.md) – lista kontrolna przy pracy z Supabase.
- [`tests/TEST_PLAN.md`](tests/TEST_PLAN.md) – plan testów E2E/manualnych.

> Jeśli dokumentacja staje się nieaktualna, dodaj zadanie w TODO i zaktualizuj odpowiednie sekcje – README służy jako główne źródło prawdy dla nowych osób w projekcie.
