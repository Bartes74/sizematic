# BUILD_PLAN.md — SizeHub (MVP, bez UI)

## 0. Cel dokumentu

Dostarczamy kompletny, techniczny plan budowy **MVP SizeHub** (PWA) z modułami: **ZPR (measurement-first, EN 13402), auto‑konwersje marek, Zaufany Krąg, reguły udostępnień (per kategoria), Secret Giver (token), Prezentowy link, powiadomienia kontekstowe, kalendarz okazji, wishlista, monetyzacja (Stripe) i RLS**. W tym dokumencie **pomijamy UI**, skupiamy się na backendzie, kontraktach, danych, bezpieczeństwie, testach i harmonogramie.

---

## 1. Aktorzy, role i przypadki użycia

### 1.1. Aktorzy systemowi
- **User (Owner)** – właściciel profilu, zarządza ZPR, udostępnieniami, linkami, płatnościami.  
- **Circle Member** – członek Zaufanego Kręgu, ma dostęp *read‑only* do wybranych kategorii wg reguł.  
- **SG Requester** – wnioskuje o czasowy dostęp do wybranej kategorii (po zakupie tokenu).  
- **SG Target** – adresat prośby, akceptuje/odrzuca dostęp w ramach Secret Giver.  
- **Public Guest (Link)** – anonimowy odbiorca Prezentowego linku, odczytuje *tylko payload* przez endpoint publiczny z tokenem.  
- **Payments Provider (Stripe)** – checkout jednorazowy dla SG, subskrypcje planów; webhooki.  
- **Push/Email Provider** – FCM (Web Push), Postmark/SendGrid (e‑maile).

### 1.2. Plany i limity (logika)
- **Free / Premium / Premium+** – różnice w limitach Kręgu, parametrach Prezentowego linku, powiadomieniach, blokadzie SG (płatna w Free/Premium, w cenie w Premium+). Przykład: Premium=4 osoby w Kręgu, Premium+=∞; SG token 20 PLN; blokada SG 5 PLN/m (Free/Premium). Prezentowy link: TTL/limit odsłon/hasło zależnie od planu.

### 1.3. Główne scenariusze (skrót)
- **ZPR**: dodawanie pomiarów wg EN 13402 i/lub szybkich „metek”; historia zmian. **Auto‑konwersje** marek (cache lokalne z priorytetem oficjalnych tabel).  
- **Udostępnianie**: reguły read‑only per kategoria do pojedynczych osób lub całego Kręgu (limity planów).  
- **Secret Giver**: Requester kupuje token (Stripe), składa prośbę o dostęp; Target akceptuje/odrzuca; dostęp czasowy tylko do wskazanej kategorii; RLS egzekwuje widoczność.  
- **Prezentowy link**: generowanie linku dla gości bez konta, z parametrami TTL, max_views, one_time i (Plus) hasłem; odczyt tylko przez Edge Function (service role), RLS bez publicznego SELECT.  
- **Powiadomienia**: reguły kontekstowe (okazje 21/7/3/1; „stare” wymiary 12/24m; dzieci co 3m; wygasanie linków 72/48/24h; SG natychmiast/24h) + tygodniowy digest. CRON przez Edge Functions.  

---

## 2. Architektura i zależności

### 2.1. Stos technologiczny (MVP)
- **Frontend (PWA)**: Next.js + React + TypeScript; React Query (server‑state), Zustand (UI/local), i18next; dane pobierane bezpośrednio z Supabase przez Server Components i Server Actions.  
- **Backend/Infra**: **Supabase** (PostgreSQL, Auth, Storage, Edge Functions, Scheduled Jobs/CRON), **Stripe** (checkout + subskrypcje), **FCM** (Web Push), **Postmark/SendGrid** (e‑mail).  
- **Bezpieczeństwo**: **RLS** per tabela, egzekwowanie udostępnień/SG w SQL, dostęp do linków publicznych wyłącznie przez Edge (service role). TLS in‑transit, szyfrowanie at‑rest, DPIA/RODO.

### 2.2. Struktura repo (monorepo)
```
/apps/web          # PWA (Next.js) – bez UI w tym planie, ale kontrakty danych/SDK
/apps/edge         # Supabase Edge Functions (TypeScript), webhook Stripe, CRONy
/packages/db       # SQL DDL (tabele, typy, indeksy), seed, polityki RLS
/packages/tests    # Playwright + test fixtures (E2E), testy integracyjne API
```

---

## 3. Model danych i migracje

Typy domenowe (enum), tabele, indeksy i relacje: **profiles, measurements, size_labels, measurement_history, brands, brand_size_maps, brand_equivalences, trust_circles, trust_circle_members, share_rules, shared_links, secret_giver_requests, privacy_blocks, events, wishlists, wishlist_items, notification_rules, notification_log, subscriptions, stripe_events**.

### 3.1. Typy i enumy
`category`, `target_gender`, `unit_pref`, `user_plan`, `sg_status`, `share_scope`, `shared_link_scope`, `notif_channel`, `size_source`.

### 3.2. Kluczowe tabele (esencja)
- **profiles** – 1:1 z auth.users; plan, preferencje jednostek, ustawienia.  
- **measurements / size_labels / measurement_history** – ZPR + metki + wersjonowanie.  
- **brands / brand_size_maps / brand_equivalences** – źródłowe mapy rozmiarów i mosty (confidence).  
- **trust_circles / trust_circle_members / share_rules** – Krąg i reguły odczytu per kategoria.  
- **shared_links** – Prezentowy link (token, kategorie, TTL, max_views, one_time, password_hash, views_count, revoked_at).  
- **secret_giver_requests** – wnioski SG i cykl życia (pending/approved/denied/expired) + approved_until.  
- **privacy_blocks** – abonament/bonus na blokadę SG.  
- **events / wishlists / wishlist_items** – kalendarz/wishlista.  
- **notification_rules / notification_log** – definicje i dziennik wysyłek.  
- **subscriptions** – lustrzany stan subskrypcji (Stripe/IAP).  
- **stripe_events** – idempotencja webhooków Stripe.

> Wszystkie FK z `on delete cascade`, indeksy dla najczęstszych zapytań (np. `brand_size_maps(brand_id,category)`, `shared_links(expires_at)`, `secret_giver_requests(target_id)`), seedy marek/map (demo) i kont testowych.

---

## 4. Polityki bezpieczeństwa (RLS) i kontrola dostępu

### 4.1. Zasady ogólne
- **Włączone RLS** na wszystkich tabelach domenowych.  
- **Prezentowy link**: dane dostępne publicznie tylko przez **Edge Function** (service role), brak publicznego `SELECT`.  
- **Dostęp niejawny** (Krąg/Share Rules/SG) wymuszany przez `EXISTS (…)` w politykach `USING`.

### 4.2. Wybrane polityki
- **profiles**: właściciel `select/update`.  
- **measurements/size_labels**: właściciel R/W; *select* przez share_rules (per kategoria dla target_user lub członka Kręgu) **lub** aktywne SG (`approved_until > now()` i kategoria zgodna).  
- **measurement_history**: *select* tylko właściciel.  
- **brands/brand_size_maps/brand_equivalences**: odczyt publiczny (dla zalogowanych).  
- **trust_circles/trust_circle_members/share_rules**: właściciel zarządza; adresaci mają *read*.  
- **shared_links**: właściciel zarządza; publiczny odczyt wyłącznie przez Edge (service).  
- **secret_giver_requests**: requester/target *select*; statusy modyfikowane przez Edge.  
- **notification_rules / notification_log / subscriptions**: owner-only zarządzane przez konto użytkownika.

---

## 5. Algorytmy domenowe

### 5.1. Auto‑konwersje marek
- **Wejście**: tryb METKA (`brand_from`, `label`) lub POMIARY (`measurements`).  
- **Proces**: odczyt zakresów z `brand_size_maps` → rzutowanie do `brand_to`/wszystkich, priorytet `source=official`, `confidence`.  
- **Cache**: opcjonalne prefetchowanie marek/map w tle; dane domyślnie pobierane na żądanie.

### 5.2. Egzekwowanie limitów planu
- Helper Edge `assertPlanLimits(user_id, feature)` – limity Kręgu, parametry Prezentowego linku (TTL, max_views, zakres kategorii), blokada SG. Zwraca błąd biznesowy (HTTP 402/403) z kodem domenowym.

### 5.3. Powiadomienia kontekstowe
- **CRON daily 07:30**: okazje (21/7/3/1), stary rozmiar (12/24m), dzieci (co 3m), link expiry (72/48/24h).  
- **CRON weekly Mon 08:00**: digest.  
- **Natychmiastowe**: SG request/new status; limit 1/6h dla kontekstowych (z wyjątkami); „godziny ciszy”.

---

## 6. API i Edge Functions (kontrakty)

> Wszystkie operacje wrażliwe (SG statusy, odczyt payloadu Prezentowego linku, webhook Stripe) przez **Edge Functions** z walidacją uprawnień, limitów i rate‑limitami.

### 6.1. ZPR / Konwersje
- `POST /api/zpr/measurements` – create/update (autoryzowany użytkownik).  
- `POST /api/size-labels` – dodanie „metki”.  
- `POST /api/conversions/recommend` – METKA/POMIARY → {brand_id, label_value, confidence[]}.

### 6.2. Krąg i reguły udostępniania
- `POST /api/circles/invite` (+ `/accept_invite`) – limity planów, e‑mail z zaproszeniem.  
- `POST /api/share-rules/set` – target_user XOR circle_id; per kategoria; expires_at (opcjonalne).

### 6.3. Secret Giver (płatny token)
- `POST /api/sg/create-checkout` – Stripe Checkout (20 PLN), metadata: requester/target/category/requested_hours.  
- `POST /api/payments/stripe-webhook` – `checkout.session.completed` → tworzy `secret_giver_requests(pending)` i powiadamia Target; zdarzenia subskrypcji aktualizują `subscriptions` i `profiles.plan`.  
- `POST /api/sg/resolve` – Target `approve|deny` → `approved_until` i notyfikacja.  
- `GET /api/sg/access?owner_id=&category=` – guard (pomocniczy).

### 6.4. Prezentowy link
- `POST /api/shared-links/create` – generacja `token`, TTL, `max_views`, `one_time`, (Plus) `password_hash`; zwraca URL.  
- `GET /api/shared-links/{token}` – **public**: waliduje `revoked_at/expires_at/max_views/one_time`, inkrementuje `views_count` atomowo, zwraca payload (wishlist + bazowe rozmiary).  
- `POST /api/shared-links/revoke` – unieważnienie.

### 6.5. Powiadomienia i digest
- `POST /functions/compute-notifications-daily` – CRON daily (service role).  
- `POST /functions/compute-digest-weekly` – CRON weekly (service role).  
- `POST /functions/notify` – adapter FCM/Postmark z logiem i rate‑limitami.

---

## 7. Synchronizacja danych

- Dane odczytywane są bezpośrednio z Supabase podczas renderowania (React Server Components, Server Actions).  
- Mutacje wykonywane w Server Actions odświeżają widoki (`router.refresh`, rewalidacje) i nie wymagają lokalnych kolejek.  
- UI obsługuje stany `loading`/`error`; zakładamy aktywne połączenie sieciowe w czasie korzystania z aplikacji.

---

## 8. Płatności i subskrypcje

- **Stripe**:  
  - *Jednorazówka* – SG token 20 PLN (Checkout Session + webhook → `secret_giver_requests(pending)`).  
  - *Subskrypcje* – plany Free/Premium/Premium+; webhook aktualizuje `subscriptions` i `profiles.plan` oraz (dla Plus) `privacy_blocks`.  
  - **Idempotencja** webhooków przez `stripe_events` (upsert po `event_id`).

---

## 9. Monitorowanie, audyt, rate‑limity

- **Rate‑limity**: `shared-links/create` ≤ 10/h; `shared-links/resolve` ≤ 60/min/IP; `sg/create-checkout` ≤ 3/h; `sg/resolve` ≤ 20/h. Błędy 429 z kodami domenowymi.  
- **Audit**: opcjonalna `audit_log(user_id, action, object, meta, at)`; minimalnie `notification_log` + Stripe `stripe_events`.  
- **Telemetry**: Plausible/Matomo (self‑hosted), strumień backend (agregaty bez PII).

---

## 10. Testy i jakość

### 10.1. Jednostkowe/integracyjne
- **Domena**: konwersje marek (METKA/POMIARY), limity planu, liczniki linków, one_time, CRONy (symulacja czasu), idempotencja webhooków.  
- **Bezpieczeństwo**: RLS – pozytywne/negatywne przypadki (owner/circle/SG/public).

### 10.2. E2E (Playwright) – scenariusze MVP
1) **Onboarding → ZPR → Konwersje**.  
2) **Free: Prezentowy link** (TTL=7, max_views=5, one_time off → 6‑te wejście blokowane; REVOKE → 404/expired).  
3) **Krąg i udostępnienia** (limit planu; widoczność tylko udostępnionych kategorii).  
4) **SG: token → approve → expiry** (czasowy dostęp tylko do wskazanej kategorii; po wygaśnięciu 403).  
5) **Misje i nagrody** (ONBOARD_1, claim nagrody → `privacy_blocks`/kupon).  
6) **Powiadomienia** (CRON: okazje, link expiry; tryb cichy).

---

## 11. Harmonogram wdrożenia (fazy i kolejność)

### Faza 0 — Przygotowanie (T‑2 tyg.)
- Repo + CI (lint, typecheck, testy).  
- `/packages/db`: typy, DDL, indeksy, seed (marki, mapy demo, konta testowe).  
- Włączenie **RLS** i polityki podstawowe.  
- **SDK Edge**: helpers (`getUser`, `assertPlanLimits`, `genToken`, `hashPassword`, `notify`, rate‑limiter).  
- Konfiguracja providerów (Supabase, Stripe – ceny/produkty, Postmark/FCM, secrets).

- **ZPR (measurements/labels/history)** + walidacja jednostek.  
- **Konwersje**: `conversions_recommend` (METKA/POMIARY) + cache marek/map.  
- Testy jednostkowe/integracyjne + E2E #1.

### Faza 2 — Sharing & Linki (T+4–T+6 tyg.)
- **Krąg + share_rules** (limity planów, zaproszenia).  
- **Prezentowy link**: create/resolve/revoke, liczniki, TTL, one_time, (Plus) hasło; RLS „Edge‑only”.  
- E2E #2–#3.

### Faza 3 — Monetyzacja i SG (T+6–T+8 tyg.)
- **Stripe**: Checkout token SG (20 PLN), subskrypcje (Free/Premium/Premium+), webhook (idempotencja).  
- **Secret Giver**: create‑checkout → webhook pending → resolve approve/deny → access guard.  
- **Blokada SG** (płatna w Free/Premium; w cenie w Plus).  
- E2E #4.

### Faza 4 — Retencja (T+8–T+10 tyg.)
- **Powiadomienia kontekstowe** (CRON daily/weekly, quiet hours, rate‑limit).  
- **Digest tygodniowy**.  
- E2E #5–#6.

### Faza 5 — Polerka/QA/Bezpieczeństwo (T+10–T+12/14 tyg.)
- Hardening RLS, testy dostępności danych, wydajność (TTI/JS budget po stronie PWA).  
- DPIA/RODO: retencje logów, eksport/usunięcie konta.  
- Monitoring i runbooki (webhooki, CRONy, limity).

---

## 12. Akceptacja techniczna (DoD)

- **Dane i RLS**: pełne DDL + polityki; testy owner/circle/SG/public.  
- **API/Edge**: kontrakty i walidacje; rate‑limit; kody domenowe błędów.  
- **Płatności**: webhook idempotentny, zmiany planów w `profiles.plan` i `privacy_blocks`.  
- **Linki**: TTL/limit/one_time/hasło (Plus) egzekwowane; REVOKE natychmiastowe.  
- **Konwersje**: METKA/POMIARY mogą korzystać z lokalnie prefetchnietych danych marek/map.  
- **Powiadomienia**: CRONy, quiet hours, log.  
- **E2E**: 6 scenariuszy przechodzi na stagingu bez P0/P1.

---

## 13. Załączniki operacyjne

- **.env przykłady** (web/edge).  
- **Seedy**: marki/mapy (demo), konta testowe, minimalne ZPR, eventy/wishlista.  
- **Komendy Stripe (dev)**: `stripe listen --forward-to ...`, `stripe trigger checkout.session.completed ...`.  
- **Playwright config** i helper `loginAs()` do E2E.  
- **Feature flags** (digest, SG) i rate‑limit per endpoint.

---

## 14. Ryzyka i mitigacje (skrót)

- **Niepełne tabele marek** → wersjonowanie `brand_size_maps`, `source`, `confidence`, komunikat „przybliżone”, cache’owanie braków po stronie serwera.  
- **Nadmiernie długie TTL linków** → domyślne krótkie, `max_views`, `one_time`, REVOKE.  
- **Niska retencja po wprowadzeniu danych** → kontekstowe powiadomienia i digest od D1.

---

# Aneks: OpenAPI Skeleton (v3.1)

```yaml
openapi: 3.1.0
info:
  title: SizeHub API (MVP)
  version: 0.1.0
servers:
  - url: https://api.sizehub.local
security:
  - bearerAuth: []
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  headers:
    X-RateLimit-Limit:
      schema: { type: integer }
      description: Maksymalna liczba żądań w oknie czasowym.
    X-RateLimit-Remaining:
      schema: { type: integer }
      description: Pozostała liczba żądań.
    X-RateLimit-Reset:
      schema: { type: integer }
      description: Reset okna (epoch seconds).
  schemas:
    Category:
      type: string
      enum: [tops, bottoms, footwear, headwear, accessories, outerwear, kids]
    MeasurementInput:
      type: object
      required: [category, unit, values]
      properties:
        category: { $ref: '#/components/schemas/Category' }
        unit: { type: string, enum: [cm, inch] }
        values:
          type: object
          additionalProperties: { type: number }
        note: { type: string }
    SizeLabelInput:
      type: object
      required: [brand_id, category, label]
      properties:
        brand_id: { type: string, format: uuid }
        category: { $ref: '#/components/schemas/Category' }
        label: { type: string }
    ConversionRequest:
      type: object
      properties:
        by_label:
          type: object
          required: [brand_from, category, label]
          properties:
            brand_from: { type: string, format: uuid }
            category: { $ref: '#/components/schemas/Category' }
            label: { type: string }
        by_measurements:
          type: object
          required: [category, unit, values]
          properties:
            category: { $ref: '#/components/schemas/Category' }
            unit: { type: string, enum: [cm, inch] }
            values:
              type: object
              additionalProperties: { type: number }
    ConversionSuggestion:
      type: object
      properties:
        brand_id: { type: string, format: uuid }
        label_value: { type: string }
        confidence: { type: number, minimum: 0, maximum: 1 }
    InviteRequest:
      type: object
      required: [email]
      properties:
        email: { type: string, format: email }
        message: { type: string }
    ShareRuleInput:
      type: object
      required: [category]
      properties:
        category: { $ref: '#/components/schemas/Category' }
        target_user_id: { type: string, format: uuid, nullable: true }
        circle_id: { type: string, format: uuid, nullable: true }
        expires_at: { type: string, format: date-time, nullable: true }
    SGCreateCheckoutInput:
      type: object
      required: [requester_id, target_id, category, requested_hours]
      properties:
        requester_id: { type: string, format: uuid }
        target_id: { type: string, format: uuid }
        category: { $ref: '#/components/schemas/Category' }
        requested_hours: { type: integer, minimum: 1, maximum: 168 }
    SGResolveInput:
      type: object
      required: [request_id, decision]
      properties:
        request_id: { type: string, format: uuid }
        decision: { type: string, enum: [approve, deny] }
    SharedLinkCreateInput:
      type: object
      required: [categories]
      properties:
        categories:
          type: array
          items: { $ref: '#/components/schemas/Category' }
        ttl_hours: { type: integer, minimum: 1, maximum: 720 }
        max_views: { type: integer, minimum: 1, maximum: 1000 }
        one_time: { type: boolean, default: false }
        password: { type: string, nullable: true }
paths:
  /api/zpr/measurements:
    post:
      summary: Create/update measurements
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/MeasurementInput' }
      responses:
        '200':
          description: OK
          headers:
            X-RateLimit-Limit: { $ref: '#/components/headers/X-RateLimit-Limit' }
            X-RateLimit-Remaining: { $ref: '#/components/headers/X-RateLimit-Remaining' }
            X-RateLimit-Reset: { $ref: '#/components/headers/X-RateLimit-Reset' }
        '400': { description: Walidacja danych }
        '401': { description: Brak autoryzacji }
  /api/size-labels:
    post:
      summary: Add quick size label
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SizeLabelInput' }
      responses:
        '200': { description: OK }
        '400': { description: Walidacja danych }
        '401': { description: Brak autoryzacji }
  /api/conversions/recommend:
    post:
      summary: Recommend size conversions (by label or measurements)
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ConversionRequest' }
      responses:
        '200':
          description: Lista propozycji
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ConversionSuggestion' }
        '400': { description: Walidacja danych }
        '401': { description: Brak autoryzacji }
  /api/circles/invite:
    post:
      summary: Invite member to Trust Circle
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/InviteRequest' }
      responses:
        '204': { description: Zaproszenie wysłane }
        '402': { description: Limit planu przekroczony }
        '401': { description: Brak autoryzacji }
  /api/share-rules/set:
    post:
      summary: Upsert share rule (user or circle, per category)
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ShareRuleInput' }
      responses:
        '200': { description: OK }
        '400': { description: Walidacja / konflikt target_user XOR circle_id }
        '401': { description: Brak autoryzacji }
  /api/sg/create-checkout:
    post:
      summary: Create Stripe Checkout for SG token
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SGCreateCheckoutInput' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  checkout_url: { type: string, format: uri }
        '402': { description: Limit planu/feature niedostępny }
        '401': { description: Brak autoryzacji }
  /api/payments/stripe-webhook:
    post:
      summary: Stripe webhook (idempotent)
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, additionalProperties: true }
      responses:
        '200': { description: OK }
        '400': { description: Nieprawidłowy podpis / event }
  /api/sg/resolve:
    post:
      summary: Target approves/denies SG request
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SGResolveInput' }
      responses:
        '200': { description: Zaktualizowano status }
        '403': { description: Brak uprawnień do tego wniosku }
        '401': { description: Brak autoryzacji }
  /api/sg/access:
    get:
      summary: Guard for client (mirrors RLS check)
      security: [ { bearerAuth: [] } ]
      parameters:
        - in: query
          name: owner_id
          schema: { type: string, format: uuid }
          required: true
        - in: query
          name: category
          schema: { $ref: '#/components/schemas/Category' }
          required: true
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  allowed: { type: boolean }
        '401': { description: Brak autoryzacji }
  /api/shared-links/create:
    post:
      summary: Create public shared link
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SharedLinkCreateInput' }
      responses:
        '200':
          description: Utworzono link
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
                  url: { type: string, format: uri }
        '402': { description: Limit planu przekroczony }
        '401': { description: Brak autoryzacji }
  /api/shared-links/{token}:
    get:
      summary: Resolve shared link (public)
      parameters:
        - in: path
          name: token
          required: true
          schema: { type: string }
        - in: query
          name: password
          required: false
          schema: { type: string }
      responses:
        '200':
          description: Payload do odczytu
          headers:
            X-RateLimit-Limit: { $ref: '#/components/headers/X-RateLimit-Limit' }
            X-RateLimit-Remaining: { $ref: '#/components/headers/X-RateLimit-Remaining' }
            X-RateLimit-Reset: { $ref: '#/components/headers/X-RateLimit-Reset' }
          content:
            application/json:
              schema:
                type: object
                properties:
                  categories: 
                    type: array
                    items: { $ref: '#/components/schemas/Category' }
                  wishlist:
                    type: array
                    items: { type: object, additionalProperties: true }
                  sizes:
                    type: object
                    additionalProperties: { type: object }
        '401': { description: Złe hasło (jeśli ustawione) }
        '404': { description: Nie znaleziono / wygasło / limit wyczerpany }
  /api/shared-links/revoke:
    post:
      summary: Revoke shared link
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token]
              properties:
                token: { type: string }
      responses:
        '204': { description: Unieważniono }
        '401': { description: Brak autoryzacji }
  /functions/compute-notifications-daily:
    post:
      summary: CRON daily (service role)
      responses:
        '204': { description: OK }
  /functions/compute-digest-weekly:
    post:
      summary: CRON weekly (service role)
      responses:
        '204': { description: OK }
  /functions/notify:
    post:
      summary: Send notification (adapter)
      security: [ { bearerAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [user_id, channel, template, data]
              properties:
                user_id: { type: string, format: uuid }
                channel: { type: string, enum: [push, email] }
                template: { type: string }
                data: { type: object, additionalProperties: true }
      responses:
        '202': { description: Przyjęto do wysyłki }
        '401': { description: Brak autoryzacji }
```
