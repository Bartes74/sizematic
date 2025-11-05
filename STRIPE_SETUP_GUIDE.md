# 💳 Stripe - Przewodnik Konfiguracji

## Krok 1: Założenie Konta Stripe

1. Przejdź do: https://stripe.com
2. Kliknij **Sign up** (Zarejestruj się)
3. Wypełnij formularz:
   - Email
   - Hasło
   - Kraj: **Poland**
4. Potwierdź email

## Krok 2: Aktywacja Konta

1. Po zalogowaniu kliknij **Activate your account**
2. Wypełnij dane firmy/osobiste:
   - Nazwa firmy/działalności
   - NIP (opcjonalnie na start)
   - Adres
   - Dane reprezentanta
3. **Nie musisz** kończyć pełnej weryfikacji teraz - możesz używać test mode

## Krok 3: Przełącz na Test Mode (Zalecane na Start)

1. W prawym górnym rogu znajdź przełącznik **Test mode**
2. Upewnij się że jest włączony (toggle na WŁĄCZONY)
3. W test mode możesz testować bez prawdziwych płatności

## Krok 4: Pobierz API Keys

### A. Klucze API

1. W menu bocznym kliknij **Developers** → **API keys**
2. Zobaczysz dwie sekcje:
   - **Publishable key** (public) - nie jest nam potrzebny
   - **Secret key** - **SKOPIUJ TO**

Przykład:
```
Secret key (test): sk_test_51AbCdEf...
Secret key (live): sk_live_51AbCdEf...  (po aktywacji)
```

### B. Webhook Secret

**WAŻNE**: To zrobimy po deployment na Vercel (potrzebny będzie URL)

## Krok 5: Utwórz Produkty i Ceny

### Opcja A: Ręcznie przez Dashboard (ŁATWIEJSZE)

#### 1. Pakiet 3 Strzały SG

1. Kliknij **Products** → **Add product**
2. Wypełnij:
   - Name: `Secret Giver - 3 strzały`
   - Description: `Pakiet 3 próśb Secret Giver`
   - Pricing model: `One time`
   - Price: `19.99 PLN`
   - Tax behavior: `Exclusive` (lub Inclusive - zależnie od preferencji)
3. Kliknij **Save product**
4. **NIE MUSISZ** kopiować Product ID - webhook obsłuży to automatycznie

#### 2. Pakiet 10 Strzałów SG

1. **Products** → **Add product**
2. Wypełnij:
   - Name: `Secret Giver - 10 strzałów`
   - Description: `Pakiet 10 próśb Secret Giver`
   - Pricing model: `One time`
   - Price: `49.99 PLN`
3. **Save product**

#### 3. Premium - Miesięczna Subskrypcja

1. **Products** → **Add product**
2. Wypełnij:
   - Name: `Premium - Miesięczny`
   - Description: `Nielimitowane SG i Kręgi + wszystkie funkcje Premium`
   - Pricing model: `Recurring`
   - Price: `19.99 PLN`
   - Billing period: `Monthly`
3. **Save product**

#### 4. Premium - Roczna Subskrypcja

1. **Products** → **Add product**
2. Wypełnij:
   - Name: `Premium - Roczny`
   - Description: `Nielimitowane SG i Kręgi + wszystkie funkcje Premium (12 miesięcy)`
   - Pricing model: `Recurring`
   - Price: `99.99 PLN`
   - Billing period: `Yearly`
3. **Save product**

### Opcja B: Przez Stripe CLI (dla zaawansowanych)

Możesz też utworzyć produkty automatycznie - kod jest w `src/lib/stripe/client.ts`.

## Krok 6: Dodaj Klucze do Vercel

### A. Przez skrypt automatyczny

```bash
cd /Users/bartek/.cursor/worktrees/sizematic/r296y

# Najpierw uruchom vercel-env-setup.sh (jeśli jeszcze nie)
# Tam jest placeholder dla Stripe

# Potem zaktualizuj:
vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY production
# Wklej skopiowany Secret Key i naciśnij Enter

# Webhook secret dodamy po deployment (Krok 8)
```

### B. Przez Vercel Dashboard

1. https://vercel.com/dashboard
2. Projekt **r296y**
3. **Settings** → **Environment Variables**
4. Dodaj:
   - `STRIPE_SECRET_KEY`: `sk_test_...` (lub `sk_live_...`)
   - `STRIPE_WEBHOOK_SECRET`: `whsec_...` (po deployment - Krok 8)

## Krok 7: Deploy na Vercel

```bash
cd /Users/bartek/.cursor/worktrees/sizematic/r296y
vercel --prod
```

Po deployment skopiuj **Production URL** (np. `https://r296y.vercel.app`)

## Krok 8: Skonfiguruj Webhook

### A. Utwórz Webhook Endpoint

1. W Stripe Dashboard: **Developers** → **Webhooks**
2. Kliknij **Add endpoint**
3. Endpoint URL: `https://[TWÓJ-PRODUCTION-URL]/api/v1/stripe/webhook`
   - Przykład: `https://r296y.vercel.app/api/v1/stripe/webhook`
4. Description: `GiftFit Production Webhook`
5. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Kliknij **Add endpoint**

### B. Pobierz Webhook Secret

1. Po utworzeniu endpointu kliknij na niego
2. W sekcji **Signing secret** kliknij **Reveal**
3. **Skopiuj** secret (format: `whsec_...`)

### C. Dodaj Webhook Secret do Vercel

```bash
# Usuń placeholder
vercel env rm STRIPE_WEBHOOK_SECRET production

# Dodaj prawdziwy secret
vercel env add STRIPE_WEBHOOK_SECRET production
# Wklej whsec_... i naciśnij Enter

# Redeploy aby zastosować zmiany
vercel --prod
```

## Krok 9: Testowanie

### Test Mode (Zalecane Pierwsze Testy)

1. Użyj testowych kart:
   - Sukces: `4242 4242 4242 4242`
   - Wymaga 3D Secure: `4000 0027 6000 3184`
   - Declined: `4000 0000 0000 0002`
   - CVV: dowolne 3 cyfry
   - Data wygaśnięcia: dowolna przyszła data

2. Przejdź do `/dashboard/secret-giver`
3. Kliknij "Wyślij prośbę" (jeśli pool = 0, zobaczysz paywall)
4. Wybierz pakiet i dokończ checkout
5. Sprawdź w Stripe Dashboard → **Payments** czy płatność przeszła
6. Sprawdź w aplikacji czy pool się zwiększył

### Live Mode (Produkcja)

1. W Stripe Dashboard przełącz na **Live mode**
2. Pobierz **Live** API keys
3. Zaktualizuj `STRIPE_SECRET_KEY` w Vercel na live key
4. Utwórz **nowy webhook endpoint** dla Live mode (ten sam URL)
5. Zaktualizuj `STRIPE_WEBHOOK_SECRET` na live webhook secret
6. Redeploy: `vercel --prod`

## 📊 Monitoring

### Stripe Dashboard

Monitoruj:
1. **Payments** - wszystkie płatności (test i live)
2. **Subscriptions** - aktywne subskrypcje
3. **Logs** → **Webhooks** - sprawdzaj czy webhooki przechodzą

### Troubleshooting Webhooków

Jeśli webhook nie działa:
1. Sprawdź **Webhooks logs** w Stripe
2. Kliknij na failed attempt
3. Zobacz response (powinien być 200)
4. Sprawdź czy endpoint URL jest poprawny
5. Sprawdź czy `STRIPE_WEBHOOK_SECRET` w Vercel jest poprawny

## 💰 Pricing - Stripe Fees

Stripe pobiera:
- 1.4% + 1 PLN (karty EU)
- 2.9% + 1 PLN (karty non-EU)

Przykład: 19.99 PLN → otrzymasz ~18.71 PLN

## 🔐 Bezpieczeństwo

- ✅ **NIE** commituj kluczy do git
- ✅ Używaj environment variables
- ✅ Test mode na development
- ✅ Live mode tylko na production
- ✅ Webhook secret verification włączony (już jest w kodzie)

## ✅ Gotowe!

Po skonfigurowaniu Stripe:
- ✅ Użytkownicy mogą kupować pakiety SG (3/10 strzałów)
- ✅ Użytkownicy mogą subskrybować Premium (miesięcznie/rocznie)
- ✅ Webhooks automatycznie aktualizują pool i role
- ✅ System jest w pełni funkcjonalny

## 🆘 Potrzebujesz Pomocy?

Stripe Support:
- Docs: https://stripe.com/docs
- Support: https://support.stripe.com/
- Community: https://github.com/stripe

