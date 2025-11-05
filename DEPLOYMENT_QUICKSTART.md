# ⚡ Quick Start - Secret Giver Deployment

## 🎯 Co Masz Już Gotowe

✅ **Supabase**: Migracje zastosowane na produkcji  
✅ **Vercel**: Projekt połączony  
✅ **Kod**: Secret Giver w pełni zaimplementowany  
✅ **Sinch**: Masz konto (potrzebne tylko API keys)

## 🚀 Szybki Start (5 minut)

### Krok 1: Pobierz Sinch Credentials

```bash
# 1. Otwórz w przeglądarce:
open https://dashboard.sinch.com/

# 2. Zaloguj się i skopiuj:
#    - SMS → Service Plans → [Twój Service Plan ID]
#    - APIs → Access Keys → [Utwórz nowy token]
```

### Krok 2: Uruchom Auto-Setup

```bash
cd /Users/bartek/.cursor/worktrees/sizematic/r296y

# Skrypt zapyta Cię o wszystkie potrzebne dane:
./vercel-env-setup.sh
```

**Będziesz potrzebować:**
- [ ] Production URL (możesz podać tymczasowy, zaktualizujesz później)
- [ ] SMTP credentials (Postmark/SendGrid lub zostaw localhost na razie)
- [ ] Sinch Service Plan ID
- [ ] Sinch API Token

### Krok 3: Deploy!

```bash
# Pierwszy deployment
vercel --prod

# Skopiuj Production URL (np. https://r296y.vercel.app)
```

### Krok 4: Stripe (po deployment)

```bash
# 1. Załóż konto: https://stripe.com
# 2. Pobierz API key: Developers → API keys
# 3. Dodaj do Vercel:
vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY production
# Wklej: sk_test_...

# 4. Utwórz webhook:
#    Stripe Dashboard → Developers → Webhooks
#    URL: https://[twój-url]/api/v1/stripe/webhook
#    
# 5. Dodaj webhook secret:
vercel env add STRIPE_WEBHOOK_SECRET production
# Wklej: whsec_...

# 6. Redeploy:
vercel --prod
```

## 📝 Szczegółowe Przewodniki

Jeśli potrzebujesz więcej szczegółów:

- **Sinch**: Przeczytaj `SINCH_SETUP_GUIDE.md`
- **Stripe**: Przeczytaj `STRIPE_SETUP_GUIDE.md`
- **Pełna checklist**: Przeczytaj `DEPLOYMENT_CHECKLIST.md`

## 🧪 Test Po Deployment

```bash
# 1. Otwórz w przeglądarce:
open https://[twój-url]/dashboard/secret-giver

# 2. Kliknij "Wyślij prośbę Secret Giver"
# 3. Sprawdź weryfikację SMS (podaj swój numer)
# 4. Sprawdź czy SMS przyszedł
# 5. Zweryfikuj kod
# 6. Wyślij testową prośbę
```

## 💰 Stripe Products (Utwórz Ręcznie)

W Stripe Dashboard → Products → Add product:

1. **Secret Giver - 3 strzały**: 19.99 PLN (one-time)
2. **Secret Giver - 10 strzałów**: 49.99 PLN (one-time)
3. **Premium - Miesięczny**: 19.99 PLN/month (recurring)
4. **Premium - Roczny**: 99.99 PLN/year (recurring)

## 🔥 TL;DR - Minimalna Konfiguracja

Jeśli chcesz tylko przetestować bez Stripe i Sinch:

```bash
# Wyłącz weryfikację SMS (opcjonalnie)
# Edytuj src/app/api/v1/secret-giver/requests/route.ts
# Zakomentuj check: if (!senderProfile.is_sms_verified)

# Deploy tylko z podstawowymi zmiennymi
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

vercel --prod
```

**⚠️ Uwaga**: To tylko do testów! W produkcji potrzebujesz pełnej konfiguracji.

## 🎉 To Wszystko!

Masz pytania? Sprawdź:
- `SECRET_GIVER_IMPLEMENTATION.md` - Pełna dokumentacja techniczna
- `DEPLOYMENT_CHECKLIST.md` - Szczegółowa checklist
- Lub napisz na support 😊

