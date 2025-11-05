#!/bin/bash
# Script to configure Vercel environment variables

# Supabase (już mam klucze)
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://orrekemjkarsmazykemn.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycmVrZW1qa2Fyc21henlrZW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDA1ODgsImV4cCI6MjA3NzA3NjU4OH0.goxTjoZvRj53oGSksN9bUb0YPmg6doXqmicZWTU77Zw"
vercel env add SUPABASE_URL production <<< "https://orrekemjkarsmazykemn.supabase.co"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycmVrZW1qa2Fyc21henlrZW1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTUwMDU4OCwiZXhwIjoyMDc3MDc2NTg4fQ.VgZwiXBolww_X30mPxvmochx6unNA8jMkNQThhRmn1Q"

# Site Configuration - UWAGA: Zmień URL na swój domain po deployment!
echo "Dodaję site configuration..."
read -p "Podaj URL produkcji (np. https://giftfit.vercel.app): " SITE_URL
vercel env add NEXT_PUBLIC_SITE_URL production <<< "$SITE_URL"
vercel env add NEXT_PUBLIC_SITE_NAME production <<< "GiftFit"
vercel env add NEXT_PUBLIC_SITE_CLAIM production <<< "Niespodzianka w idealnym rozmiarze!"
vercel env add NEXT_PUBLIC_LOGO_URL production <<< "$SITE_URL/logo.svg"

# Email SMTP - Postmark/SendGrid
echo ""
echo "=== EMAIL CONFIGURATION ==="
echo "Dla produkcji potrzebujesz dostawcę SMTP (Postmark, SendGrid, AWS SES)"
echo ""
read -p "SMTP_HOST: " SMTP_HOST
read -p "SMTP_PORT: " SMTP_PORT
read -p "SMTP_USER: " SMTP_USER
read -p "SMTP_PASS: " SMTP_PASS
read -p "SMTP_FROM_EMAIL: " SMTP_FROM

vercel env add SMTP_HOST production <<< "$SMTP_HOST"
vercel env add SMTP_PORT production <<< "$SMTP_PORT"
vercel env add SMTP_USER production <<< "$SMTP_USER"
vercel env add SMTP_PASS production <<< "$SMTP_PASS"
vercel env add SMTP_FROM_EMAIL production <<< "$SMTP_FROM"
vercel env add TRUSTED_CIRCLE_FROM_EMAIL production <<< "$SMTP_FROM"

# Sinch SMS
echo ""
echo "=== SINCH SMS CONFIGURATION ==="
echo "Zaloguj się na https://dashboard.sinch.com/"
echo "1. Przejdź do SMS > Overview"
echo "2. Skopiuj Service Plan ID"
echo "3. Przejdź do APIs > Access Keys"
echo "4. Utwórz nowy API Token"
echo ""
read -p "SINCH_SERVICE_PLAN_ID: " SINCH_PLAN
read -p "SINCH_API_TOKEN: " SINCH_TOKEN

vercel env add SINCH_SERVICE_PLAN_ID production <<< "$SINCH_PLAN"
vercel env add SINCH_API_TOKEN production <<< "$SINCH_TOKEN"

# Stripe - będzie skonfigurowane później
echo ""
echo "=== STRIPE CONFIGURATION ==="
echo "Stripe zostanie skonfigurowane w następnym kroku"
echo "Na razie dodaję placeholdery..."
vercel env add STRIPE_SECRET_KEY production <<< "sk_live_PLACEHOLDER"
vercel env add STRIPE_WEBHOOK_SECRET production <<< "whsec_PLACEHOLDER"

echo ""
echo "✅ Zmienne środowiskowe zostały dodane do Vercel!"
echo ""
echo "NASTĘPNE KROKI:"
echo "1. Skonfiguruj Stripe (uruchom ./stripe-setup-guide.sh)"
echo "2. Zaktualizuj STRIPE_SECRET_KEY i STRIPE_WEBHOOK_SECRET"
echo "3. Uruchom: vercel --prod"

