# Ostatnie Kroki - Naprawa Rejestracji

## ✅ CO ZOSTAŁO ZROBIONE (przez CLI)

### 1. Vercel Environment Variable
- ✅ **Zaktualizowano** `NEXT_PUBLIC_SITE_URL` w Production
- **Stara wartość**: `https://sizematic.vercel.app/`
- **Nowa wartość**: `https://www.gift.fit`
- **Status**: Gotowe, wymaga redeploy

### 2. Kod i Dokumentacja
- ✅ Zaktualizowano `.env.local` (dla local dev)
- ✅ Zaktualizowano `.env.example`
- ✅ Utworzono 9 plików dokumentacji w `/docs`
- ✅ Zaktualizowano `README.md`

---

## ⚠️ CO WYMAGA RĘCZNEJ KONFIGURACJI

### Supabase Redirect URLs (tylko przez Dashboard)

**Dlaczego CLI nie może tego zrobić?**
Supabase CLI (v2.54.11) nie ma komend do zarządzania konfiguracją Authentication. Te ustawienia są dostępne tylko przez:
- Supabase Dashboard (web UI)
- Management API (wymaga access tokena którego CLI nie eksponuje łatwo)

**Co musisz zrobić:**

#### Krok 1: Otwórz Supabase Dashboard
```
https://supabase.com/dashboard/project/orrekemjkarsmazykemn/auth/url-configuration
```

#### Krok 2: Dodaj Site URL
Pole: **Site URL**
```
https://www.gift.fit
```

#### Krok 3: Dodaj Redirect URLs
Pole: **Redirect URLs** (każdy URL w nowej linii lub oddzielony przecinkiem)
```
https://gift.fit/**
https://gift.fit/auth/callback
https://www.gift.fit/**
https://www.gift.fit/auth/callback
https://sizematic.vercel.app/**
https://sizematic.vercel.app/auth/callback
```

**Uwaga**: Wildcard `**` pozwala na wszystkie ścieżki pod domeną

#### Krok 4: Zapisz zmiany
Kliknij **Save** na dole strony

---

## 🚀 DEPLOYMENT

Po zaktualizowaniu Supabase redirect URLs, wykonaj redeploy:

```bash
vercel --prod
```

Lub przez Vercel Dashboard:
```
https://vercel.com/bartek-dajerpls-projects/sizematic/deployments
→ Kliknij "Redeploy" na ostatnim deployment
```

---

## ✅ WERYFIKACJA

### 1. Sprawdź czy środowiskowa zmienna się zaktualizowała
```bash
vercel env ls production | grep SITE_URL
```
Powinieneś zobaczyć: `NEXT_PUBLIC_SITE_URL` (Encrypted)

### 2. Po redeploy, przetestuj rejestrację
1. Otwórz: https://gift.fit w trybie incognito
2. Przejdź do formularza rejestracji
3. Zarejestruj nowy account (użyj nowego email)
4. Sprawdź czy otrzymałeś email potwierdzający
5. Kliknij link w emailu
6. Sprawdź czy jesteś zalogowany

### 3. Sprawdź logi (jeśli są problemy)
```bash
vercel logs --production
```

### 4. Sprawdź bazę danych
```bash
supabase db remote exec --linked "SELECT email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;"
```

---

## 📊 PODSUMOWANIE

| Zadanie | Status | Metoda |
|---------|--------|--------|
| Vercel SITE_URL | ✅ Gotowe | Vercel CLI |
| Kod i dokumentacja | ✅ Gotowe | Automatycznie |
| Supabase Redirect URLs | ⏳ Do zrobienia | Dashboard manual |
| Redeploy | ⏳ Do zrobienia | `vercel --prod` |
| Testing | ⏳ Po deploy | Manual |

---

## 🆘 TROUBLESHOOTING

### Jeśli rejestracja nadal nie działa po wszystkich krokach:

1. **Sprawdź czy redirect URLs są poprawnie zapisane**
   - Wejdź na dashboard Supabase i zweryfikuj listę

2. **Sprawdź browser console**
   - F12 → Console → szukaj błędów związanych z auth

3. **Sprawdź Network tab**
   - F12 → Network → filtruj "auth" → szukaj 400/403/500 errors

4. **Sprawdź Supabase Auth logs**
   - Dashboard → Logs → Auth Logs
   - Szukaj failed signup attempts

5. **Sprawdź czy email confirmation jest włączony**
   ```bash
   grep "enable_confirmations" supabase/config.toml
   ```
   Powinno być: `enable_confirmations = true`

---

## 📞 NASTĘPNE KROKI

1. **TERAZ**: Zaktualizuj Supabase redirect URLs (5 minut)
2. **TERAZ**: Wykonaj redeploy (`vercel --prod`) (3-5 minut)
3. **TERAZ**: Przetestuj rejestrację (2 minuty)
4. Jeśli są problemy, sprawdź troubleshooting powyżej

**Szacowany czas**: ~10-15 minut

---

## ℹ️ WIĘCEJ INFORMACJI

Szczegółowa dokumentacja znajduje się w:
- `docs/SZYBKA_NAPRAWA.md` - Quick start guide
- `docs/FIX_PRODUCTION_REGISTRATION.md` - Pełna dokumentacja techniczna
- `docs/CHECKLIST_NAPRAWA_REJESTRACJI.md` - Checklist do wydruku
- `REGISTRATION_FIX_SUMMARY.md` - Executive summary
