# 🚀 Szybka Naprawa Rejestracji - gift.fit

## Problem
Użytkownicy nie mogą się zarejestrować na https://gift.fit

## Rozwiązanie (5 minut)

### 1️⃣ Supabase Dashboard

https://supabase.com/dashboard → projekt **orrekemjkarsmazykemn**

**Authentication → URL Configuration → Redirect URLs**

Dodaj (każdy w nowej linii):
```
https://gift.fit/**
https://gift.fit/auth/callback
https://www.gift.fit/**
https://www.gift.fit/auth/callback
```

Kliknij **Save**.

---

### 2️⃣ Vercel Environment Variables

https://vercel.com/dashboard → Twój projekt → **Settings** → **Environment Variables**

Dodaj nową zmienną:
- **Name**: `NEXT_PUBLIC_SITE_URL`
- **Value**: `https://www.gift.fit`
- **Environment**: ✅ **Production** (tylko Production!)

Kliknij **Save**.

---

### 3️⃣ Redeploy

```bash
vercel --prod
```

Lub w Vercel Dashboard:
**Deployments** → ostatni deployment → **⋯** → **Redeploy** (bez cache)

---

### 4️⃣ Test

1. Otwórz https://www.gift.fit
2. Kliknij "Zarejestruj się"
3. Wypełnij formularz
4. ✅ Powinno działać!

---

## Szczegóły

Więcej informacji: [FIX_PRODUCTION_REGISTRATION.md](./FIX_PRODUCTION_REGISTRATION.md)

## Checklist

- [ ] Redirect URLs dodane w Supabase
- [ ] `NEXT_PUBLIC_SITE_URL` ustawione w Vercel Production
- [ ] Redeploy wykonany
- [ ] Rejestracja działa

**Czas wykonania**: ~5 minut
**Status po naprawie**: ✅ Rejestracja działa na produkcji
