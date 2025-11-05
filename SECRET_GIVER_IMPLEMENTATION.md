# Secret Giver - Dokumentacja Implementacji

## 📋 Przegląd

Secret Giver to funkcjonalność pozwalająca użytkownikom prosić znajomych o rozmiary ubrań bez zdradzania niespodzianki prezentu. Implementacja obejmuje:

- ✅ Weryfikację SMS (Sinch) z darmową pulą 2 "strzałów"
- ✅ System próśb z czasowym dostępem (48h)
- ✅ Integrację z Zaufanym Kręgiem
- ✅ Monetyzację przez Stripe (pakiety tokenów + subskrypcje)
- ✅ Powiadomienia email dla wszystkich stanów
- ✅ CRON jobs dla automatycznego wygasania
- ✅ Public landing page dla użytkowników bez konta
- ✅ UI dashboard z modałami

## 🗄️ Struktura Bazy Danych

### Nowe Tabele

#### `secret_giver_requests`
Główna tabela próśb Secret Giver:
- `sender_id` - profil nadawcy
- `recipient_identifier` - email lub telefon odbiorcy
- `recipient_profile_id` - profil odbiorcy (jeśli ma konto)
- `requested_category` - kategoria rozmiaru (enum)
- `status` - stan prośby: pending/approved/rejected/expired
- `data_payload` - rozmiar podany przez odbiorcę
- `is_anonymous` - czy prośba anonimowa
- `is_from_circle_member` - czy są w Kręgu Zaufanych
- `expires_at` - wygaśnięcie (48h po akceptacji)
- `token` - UUID dla publicznego dostępu

#### `sms_verification_codes`
Kody weryfikacyjne SMS:
- `profile_id` - właściciel
- `phone_number` - numer telefonu
- `code` - 6-cyfrowy kod
- `expires_at` - wygaśnięcie (10 minut)
- `verified_at` - timestamp weryfikacji

#### `subscriptions`
Subskrypcje Stripe:
- `profile_id` - właściciel
- `stripe_subscription_id` - ID w Stripe
- `stripe_customer_id` - ID klienta w Stripe
- `status` - stan subskrypcji
- `current_period_start/end` - okres rozliczeniowy

#### `stripe_events`
Log webhooków Stripe (idempotencja):
- `stripe_event_id` - ID wydarzenia (unique)
- `event_type` - typ wydarzenia
- `event_data` - pełne dane (JSONB)

### Rozszerzenia Istniejących Tabel

#### `profiles`
Dodane pola:
- `is_sms_verified` (boolean) - czy zweryfikowany SMS
- `free_sg_pool` (integer) - pula darmowych strzałów
- `phone_number` (text) - numer telefonu
- `allow_anonymous_sg` (boolean) - czy akceptuje anonimowe prośby

## 🔐 RLS Policies

### Secret Giver Requests
- **Sender**: może tworzyć, przeglądać i aktualizować swoje prośby
- **Recipient**: może przeglądać i odpowiadać na prośby do siebie
- **Matching**: również przez email/phone jeśli recipient_profile_id jest null

### Measurements - Rozszerzone
Dodany dostęp dla Secret Giver:
- Jeśli status = 'approved' AND expires_at > now() AND kategoria się zgadza
- Requester ma tymczasowy dostęp do pomiarów

## 🔌 API Endpoints

### Secret Giver
```
GET  /api/v1/secret-giver/eligibility
POST /api/v1/secret-giver/requests
GET  /api/v1/secret-giver/requests?type=sent|received|all
GET  /api/v1/secret-giver/requests/[id]
POST /api/v1/secret-giver/requests/[id]/respond
POST /api/v1/secret-giver/checkout
```

### SMS Verification
```
POST /api/v1/sms/send-code
POST /api/v1/sms/verify-code
```

### Public (bez auth)
```
GET  /api/v1/secret-giver/public/[token]
POST /api/v1/secret-giver/public/[token]
```

### Stripe
```
POST /api/v1/stripe/webhook
```

## 📧 Powiadomienia Email

### Typy Wiadomości

1. **Request Notification** - odbiorca otrzymuje prośbę
   - Warianty treści zależnie od `is_from_circle_member` i `is_anonymous`
   - Link do publicznej strony (bez konta) lub dashboardu (z kontem)
   - Propozycja założenia konta (dla użytkowników bez konta)

2. **Approved Notification** - nadawca otrzymał dostęp
   - Informacja o otrzymanym rozmiarze
   - Czas wygaśnięcia (48h)
   - Propozycja dodania do Kręgu Zaufanych

3. **Rejected Notification** - prośba odrzucona

4. **Expired Notification** - prośba wygasła
   - Timeout (72h bez odpowiedzi)
   - Access expired (48h po akceptacji)

## ⏰ CRON Jobs

Wykorzystuje `pg_cron`:

### Expire Old Pending Requests
```sql
-- Co godzinę (0 * * * *)
-- Wygasza pending requests starsze niż 72h
```

### Expire Approved Requests
```sql
-- Co 15 minut (*/15 * * * *)
-- Wygasza approved requests po expires_at
```

## 💳 Monetyzacja (Stripe)

### Pakiety Tokenów
- **3 strzały**: 19.99 PLN
- **10 strzałów**: 49.99 PLN (najlepsza wartość)

### Subskrypcje Premium
- **Miesięczna**: 19.99 PLN/miesiąc
- **Roczna**: 99.99 PLN/rok (najlepsza opcja)

### Webhook Events
Obsługiwane:
- `checkout.session.completed` - dodanie SG pool lub aktywacja subskrypcji
- `customer.subscription.created/updated` - aktualizacja roli
- `customer.subscription.deleted` - downgrade do free
- `invoice.payment_succeeded/failed` - monitoring płatności

## 🎨 Komponenty UI

### `SecretGiverDashboard`
Główny widok:
- Status eligibility (SMS, pool, premium)
- Lista próśb (filtry: sent/received/all)
- Formularz nowej prośby
- Odpowiadanie na prośby

### `SMSVerificationModal`
Dwuetapowy modal:
1. Podanie numeru telefonu
2. Wprowadzenie kodu 6-cyfrowego
3. Sukces → odblokowanie 2 strzałów

### `SGPaywallModal`
Wybór pakietu/subskrypcji:
- Sekcja tokenów (jednorazowe)
- Sekcja subskrypcji (cykliczne)
- Przekierowanie do Stripe Checkout

## 🌐 Public Landing Page

`/public/secret-giver/[token]`

Features:
- Weryfikacja tokenu i statusu prośby
- Dynamiczna treść zależnie od flagi anonymous/circle
- Formularz podania rozmiaru
- Propozycja rejestracji (dla nowych użytkowników)
- Potwierdzenie wysłania

## 🔧 Zmienne Środowiskowe

Dodaj do `.env.local`:

```bash
# Sinch SMS
SINCH_SERVICE_PLAN_ID=your_service_plan_id
SINCH_API_TOKEN=your_api_token

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (już skonfigurowane)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM_EMAIL=...
```

## 🚀 Deployment Checklist

### Supabase
- [ ] Uruchom migracje na produkcji
- [ ] Włącz pg_cron extension
- [ ] Sprawdź CRON jobs
- [ ] Zweryfikuj RLS policies

### Stripe
- [ ] Utwórz produkty i ceny na produkcji
- [ ] Skonfiguruj webhook endpoint
- [ ] Dodaj klucze produkcyjne do env
- [ ] Przetestuj flow płatności

### Sinch
- [ ] Utwórz Service Plan
- [ ] Wygeneruj API Token
- [ ] Dodaj do env
- [ ] Przetestuj wysyłkę SMS

### Email
- [ ] Sprawdź templaty emaili
- [ ] Zweryfikuj SMTP credentials
- [ ] Przetestuj wszystkie typy notyfikacji

## 🧪 Testowanie

### Scenariusze do przetestowania:

1. **SMS Verification Flow**
   - Wysłanie kodu
   - Rate limiting (max 3/h)
   - Weryfikacja kodu
   - Przyznanie free pool

2. **Request Flow - User z kontem**
   - Tworzenie prośby
   - Sprawdzanie Kręgu Zaufanych
   - Email notification
   - Odpowiedź (approve/reject)
   - Dostęp do danych

3. **Request Flow - User bez konta**
   - Odbiór emaila z tokenem
   - Public landing page
   - Podanie rozmiaru
   - Propozycja rejestracji

4. **Monetization**
   - Wyczerpanie pool
   - Paywall modal
   - Stripe checkout
   - Webhook processing
   - Pool increment

5. **Expiration**
   - Pending timeout (72h)
   - Approved expiration (48h)
   - Email notifications

## 📊 Metryki do Monitorowania

- Współczynnik weryfikacji SMS
- Conversion rate: free → paid
- Średni czas odpowiedzi na prośby
- % próśb zatwierdzonych vs odrzuconych
- Retention po użyciu Secret Giver

## 🐛 Known Issues / TODO

- [ ] Dodać rate limiting dla API endpoints
- [ ] Implementować retry logic dla failed emails
- [ ] Dodać analytics tracking
- [ ] Rozszerzyć testy E2E (Playwright)
- [ ] Dodać admin panel do zarządzania próśbami

## 📚 Dodatkowa Dokumentacja

- Szczegóły biznesowe: `/secret_giver.md`
- Architektura: `/BUILD_PLAN.md`
- UI/UX: `/UI.md`

