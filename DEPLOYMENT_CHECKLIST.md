# 🚀 Deployment Checklist - Secret Giver

## ✅ Status

- [x] **Supabase migracje** - Zastosowane na produkcji
- [x] **Vercel projekt** - Połączony (r296y)
- [ ] **Zmienne środowiskowe** - Do skonfigurowania
- [ ] **Sinch SMS** - Do skonfigurowania
- [ ] **Stripe** - Do skonfigurowania
- [ ] **Production deployment** - Do wykonania

## 📋 Kroki Deployment

### 1. ✅ Supabase (GOTOWE)

```bash
# Już wykonane:
✅ supabase db push
✅ Migracje zastosowane:
   - 20251105000000_create_secret_giver.sql
   - 20251105000001_create_stripe_tables.sql
   - 20251105000002_create_sg_cron_jobs.sql
```

### 2. ✅ Vercel Link (GOTOWE)

```bash
# Już wykonane:
✅ vercel link --yes
✅ Projekt: bartek-dajerpls-projects/r296y
```

### 3. ⏳ Konfiguracja Zmiennych Środowiskowych

```bash
cd /Users/bartek/.cursor/worktrees/sizematic/r296y

# Uruchom skrypt interaktywny:
./vercel-env-setup.sh
```

**Co będzie potrzebne:**
- ✅ Supabase credentials (już mam)
- Production URL (dostaniesz po pierwszym deploy)
- Email SMTP (Postmark/SendGrid)
- Sinch API credentials (masz konto)
- Stripe keys (założysz konto)

### 4. ⏳ Sinch SMS Setup

Szczegółowy przewodnik: `SINCH_SETUP_GUIDE.md`

**Quick Start:**
1. Zaloguj się: https://dashboard.sinch.com/
2. SMS → Service Plans → Skopiuj Service Plan ID
3. APIs → Access Keys → Utwórz token
4. Dodaj do Vercel (przez skrypt lub ręcznie)

### 5. ⏳ Stripe Setup

Szczegółowy przewodnik: `STRIPE_SETUP_GUIDE.md`

**Quick Start:**
1. Zarejestruj się: https://stripe.com
2. Aktywuj konto (możesz zacząć od test mode)
3. Developers → API keys → Skopiuj Secret key
4. Products → Utwórz 4 produkty:
   - Secret Giver - 3 strzały (19.99 PLN)
   - Secret Giver - 10 strzałów (49.99 PLN)
   - Premium - Miesięczny (19.99 PLN/m)
   - Premium - Roczny (99.99 PLN/rok)
5. Dodaj API key do Vercel

### 6. ⏳ Pierwszy Deployment

```bash
# Po skonfigurowaniu zmiennych środowiskowych:
cd /Users/bartek/.cursor/worktrees/sizematic/r296y

# Deploy na produkcję:
vercel --prod

# Skopiuj Production URL (np. https://r296y.vercel.app)
```

### 7. ⏳ Webhook Stripe (PO deployment)

1. W Stripe Dashboard: Developers → Webhooks
2. Add endpoint: `https://[TWÓJ-URL]/api/v1/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Skopiuj Webhook Secret (whsec_...)
5. Dodaj do Vercel:
   ```bash
   vercel env rm STRIPE_WEBHOOK_SECRET production
   vercel env add STRIPE_WEBHOOK_SECRET production
   # Wklej whsec_...
   ```
6. Redeploy: `vercel --prod`

### 8. ⏳ Aktualizacja Site URL

Po pierwszym deployment:

```bash
# Zaktualizuj NEXT_PUBLIC_SITE_URL z prawdziwym URL
vercel env rm NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production
# Wklej https://r296y.vercel.app (lub custom domain)

vercel env rm NEXT_PUBLIC_LOGO_URL production
vercel env add NEXT_PUBLIC_LOGO_URL production
# Wklej https://r296y.vercel.app/logo.svg

# Redeploy
vercel --prod
```

## 🧪 Testowanie Po Deployment

### 1. Test Podstawowy
- [ ] Strona główna ładuje się
- [ ] Dashboard ładuje się
- [ ] `/dashboard/secret-giver` jest dostępny

### 2. Test Secret Giver Flow
- [ ] Kliknij "Wyślij prośbę Secret Giver"
- [ ] Sprawdź czy wymaga weryfikacji SMS
- [ ] Podaj numer telefonu
- [ ] Sprawdź czy SMS przychodzi (Sinch)
- [ ] Zweryfikuj kod
- [ ] Sprawdź czy free_sg_pool = 2

### 3. Test Monetyzacji
- [ ] Wyczerpaj free pool (wyślij 2 prośby)
- [ ] Kliknij "Wyślij prośbę" → powinien pokazać paywall
- [ ] Kliknij pakiet → przekierowanie do Stripe
- [ ] Dokończ testową płatność (card: 4242 4242 4242 4242)
- [ ] Sprawdź w Stripe Dashboard czy payment przeszedł
- [ ] Sprawdź w aplikacji czy pool się zwiększył

### 4. Test Public Landing Page
- [ ] Wyślij prośbę do emaila który nie ma konta
- [ ] Sprawdź czy email przyszedł
- [ ] Kliknij link w emailu
- [ ] Sprawdź czy public page się załadowała
- [ ] Podaj rozmiar i zatwierdź
- [ ] Sprawdź czy nadawca otrzymał email z sukcesem

### 5. Test Webhooks
- [ ] Stripe Dashboard → Developers → Webhooks
- [ ] Sprawdź czy webhook endpoint ma status "Enabled"
- [ ] Wykonaj testową płatność
- [ ] Sprawdź webhook logs czy przeszedł (status 200)

## 📊 Monitoring

### Logs Aplikacji
```bash
# Vercel logs
vercel logs --prod

# Lub w Vercel Dashboard:
# https://vercel.com/dashboard → Projekt → Logs
```

### Stripe Dashboard
- Payments → Sprawdzaj płatności
- Subscriptions → Aktywne subskrypcje
- Webhooks → Logi webhooków

### Sinch Dashboard
- SMS → Logs → Historia SMS
- Sprawdzaj delivery status

### Supabase Dashboard
- Database → SQL Editor → Sprawdzaj tabele
- Logs → Edge Functions (jeśli używasz)

## 🆘 Troubleshooting

### Problem: Webhook nie działa
```bash
# Sprawdź secret
vercel env ls production | grep STRIPE_WEBHOOK

# Sprawdź w Stripe czy URL jest poprawny
# https://[twój-url]/api/v1/stripe/webhook

# Sprawdź logi w Stripe Dashboard
```

### Problem: SMS nie przychodzą
```bash
# Sprawdź credentials
vercel env ls production | grep SINCH

# Sprawdź balance w Sinch Dashboard
# Sprawdź logi SMS w Sinch
```

### Problem: Email nie przychodzą
```bash
# Sprawdź SMTP credentials
vercel env ls production | grep SMTP

# Dla dev: użyj MailHog
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

## 🎉 Po Sukcesie

Gratulacje! Secret Giver jest live 🎊

**Następne kroki:**
1. Przełącz Stripe z test mode na live mode (gdy będziesz gotowy)
2. Dodaj custom domain w Vercel
3. Skonfiguruj analytics (Plausible/GA)
4. Monitor errors i performance

## 📚 Dodatkowe Zasoby

- `SECRET_GIVER_IMPLEMENTATION.md` - Dokumentacja techniczna
- `SINCH_SETUP_GUIDE.md` - Szczegóły Sinch
- `STRIPE_SETUP_GUIDE.md` - Szczegóły Stripe
- `ENVIRONMENT_VARIABLES.md` - Lista zmiennych

