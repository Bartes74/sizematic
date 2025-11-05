# Environment Variables

## Wymagane Zmienne

Utwórz plik `.env.local` w katalogu głównym projektu z następującymi zmiennymi:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=GiftFit
NEXT_PUBLIC_SITE_CLAIM=Niespodzianka w idealnym rozmiarze!
NEXT_PUBLIC_LOGO_URL=http://localhost:3000/logo.svg

# Email (SMTP)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=giftfit@localhost.dev
TRUSTED_CIRCLE_FROM_EMAIL=giftfit@localhost.dev

# Sinch SMS (Secret Giver) - WYMAGANE dla Secret Giver
SINCH_SERVICE_PLAN_ID=your-service-plan-id
SINCH_API_TOKEN=your-api-token

# Stripe (Secret Giver & Subscriptions) - WYMAGANE dla monetyzacji
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
NEXT_PUBLIC_GA_ID=
```

## Instrukcje Konfiguracji

### Supabase
1. Utwórz projekt na [supabase.com](https://supabase.com)
2. Skopiuj URL i klucze z Project Settings > API
3. Zastosuj migracje: `supabase db push`

### Sinch SMS
1. Zarejestruj się na [sinch.com](https://www.sinch.com/)
2. Utwórz Service Plan w sekcji SMS
3. Wygeneruj API Token
4. Skopiuj Service Plan ID i API Token

### Stripe
1. Utwórz konto na [stripe.com](https://stripe.com)
2. Skopiuj klucze testowe z Developers > API keys
3. Utwórz webhook endpoint: `/api/v1/stripe/webhook`
4. Skopiuj Webhook Secret

### Email (SMTP)
#### Dla developmentu (MailHog):
```bash
# Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Lub mailcatcher
gem install mailcatcher
mailcatcher
```

#### Dla produkcji:
Użyj Postmark, SendGrid, AWS SES lub innego dostawcy SMTP.

## Weryfikacja Konfiguracji

Po ustawieniu zmiennych, zweryfikuj działanie:

```bash
# Test Supabase
pnpm dev
# Sprawdź czy dashboard się ładuje

# Test SMS (wymaga Sinch)
# Przejdź do Secret Giver i spróbuj zweryfikować numer telefonu

# Test Stripe (wymaga webhook)
stripe listen --forward-to localhost:3000/api/v1/stripe/webhook
```

