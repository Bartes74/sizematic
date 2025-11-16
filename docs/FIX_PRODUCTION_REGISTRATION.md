# Naprawa Rejestracji na Produkcji (gift.fit)

## Problem

Użytkownicy nie mogą zarejestrować się na stronie produkcyjnej **https://gift.fit** i **https://www.gift.fit**.

## Przyczyna

Aplikacja używa Supabase do autentykacji. Podczas rejestracji:

1. Użytkownik wypełnia formularz na `https://gift.fit` lub `https://www.gift.fit`
2. Aplikacja wywołuje `supabase.auth.signUp()` z parametrem:
   ```typescript
   emailRedirectTo: `${window.location.origin}/auth/callback`
   ```
   gdzie `window.location.origin` to `https://gift.fit` lub `https://www.gift.fit`

3. Supabase **odrzuca** żądanie jeśli ten URL nie jest na liście dozwolonych redirect URLs

## Sprawdzenie Aktualnej Konfiguracji Supabase

### Krok 1: Zaloguj się do Supabase Dashboard

1. Otwórz: https://supabase.com/dashboard
2. Wybierz projekt: **orrekemjkarsmazykemn**

### Krok 2: Sprawdź URL Configuration

1. W lewym menu kliknij **Authentication**
2. Kliknij **URL Configuration**
3. Sprawdź sekcję **Redirect URLs**

### Krok 3: Zweryfikuj obecność następujących URLs

W sekcji "Redirect URLs" powinny być:

```
https://gift.fit/**
https://gift.fit/auth/callback
https://www.gift.fit/**
https://www.gift.fit/auth/callback
https://sizematic.vercel.app/**
https://sizematic.vercel.app/auth/callback
```

**JEŚLI** któregokolwiek z tych URLs brakuje - przejdź do Kroku 4.

**JEŚLI** wszystkie URLs są obecne - przejdź do sekcji "Sprawdzenie Zmiennych Środowiskowych Vercel".

## Krok 4: Dodanie Brakujących Redirect URLs

### Przez Supabase Dashboard:

1. W sekcji **Redirect URLs** kliknij w pole tekstowe
2. Dodaj każdy brakujący URL w osobnej linii:
   ```
   https://gift.fit/**
   https://gift.fit/auth/callback
   https://www.gift.fit/**
   https://www.gift.fit/auth/callback
   https://sizematic.vercel.app/**
   https://sizematic.vercel.app/auth/callback
   ```
3. Kliknij **Save** lub **Update**
4. Poczekaj 1-2 minuty na propagację zmian

## Sprawdzenie Zmiennych Środowiskowych Vercel

Aplikacja potrzebuje zmiennej środowiskowej `NEXT_PUBLIC_SITE_URL` ustawionej na produkcji.

### Krok 5: Sprawdź zmienne środowiskowe w Vercel

#### Opcja A: Przez Vercel CLI

```bash
# Zaloguj się do Vercel
vercel login

# Lista zmiennych środowiskowych produkcyjnych
vercel env ls production
```

Sprawdź czy istnieje `NEXT_PUBLIC_SITE_URL`.

#### Opcja B: Przez Vercel Dashboard

1. Otwórz: https://vercel.com/dashboard
2. Znajdź swój projekt (prawdopodobnie **sizematic** lub podobna nazwa)
3. Kliknij **Settings** → **Environment Variables**
4. Sprawdź czy istnieje `NEXT_PUBLIC_SITE_URL` dla **Production**

### Krok 6: Ustaw NEXT_PUBLIC_SITE_URL (jeśli nie istnieje)

#### Opcja A: Przez Vercel CLI

```bash
vercel env add NEXT_PUBLIC_SITE_URL production
# Wpisz: https://www.gift.fit
# Naciśnij Enter
```

#### Opcja B: Przez Vercel Dashboard

1. W **Settings** → **Environment Variables** kliknij **Add New**
2. Name: `NEXT_PUBLIC_SITE_URL`
3. Value: `https://www.gift.fit`
4. Environment: **Production** (zaznacz tylko Production)
5. Kliknij **Save**

**WAŻNE**: Używamy `https://www.gift.fit` (z www) ponieważ `https://gift.fit` przekierowuje do `https://www.gift.fit`.

### Krok 7: Redeploy Aplikacji

Po dodaniu lub zmianie zmiennych środowiskowych **musisz** zrobić redeploy:

```bash
# Z katalogu projektu
vercel --prod
```

Lub:

1. W Vercel Dashboard przejdź do zakładki **Deployments**
2. Znajdź ostatni deployment
3. Kliknij przycisk **⋯** (trzy kropki)
4. Wybierz **Redeploy**
5. Upewnij się że wybrana jest opcja **Use existing Build Cache** = OFF (wyłączone)
6. Kliknij **Redeploy**

## Testowanie Rejestracji

### Krok 8: Przetestuj rejestrację na produkcji

1. Otwórz: **https://www.gift.fit**
2. Kliknij przycisk **Zarejestruj się** / **Register**
3. Wypełnij formularz:
   - **Wyświetlana nazwa**: Test User
   - **Email**: twoj-testowy-email@example.com
   - **Hasło**: Test1234!@ (min. 8 znaków, wielka litera, cyfra, znak specjalny)
   - **Potwierdź hasło**: Test1234!@
4. Kliknij **Zarejestruj się**

### Oczekiwane zachowanie:

✅ **Sukces**:
- Brak błędów w konsoli przeglądarki (F12 → Console)
- Wyświetla się komunikat: "Sprawdź swoją skrzynkę email, aby potwierdzić konto" lub podobny
- Email potwierdzający został wysłany

❌ **Błąd**:
- Komunikat błędu: "Invalid redirect URL" lub podobny
- W konsoli przeglądarki: błąd Supabase
- **ROZWIĄZANIE**: Wróć do Kroku 4 i sprawdź czy wszystkie redirect URLs zostały dodane

### Krok 9: Potwierdź email i zaloguj się

1. Sprawdź skrzynkę odbiorczą (może trafić do SPAM)
2. Kliknij link potwierdzający w emailu
3. Powinieneś zostać przekierowany do `https://www.gift.fit/auth/callback`
4. Następnie powinieneś zostać zalogowany i przekierowany do `/dashboard`

## Weryfikacja w Bazie Danych

### Krok 10: Sprawdź czy użytkownik został utworzony

1. W Supabase Dashboard przejdź do **Table Editor**
2. Wybierz tabelę **auth.users**
3. Sprawdź czy istnieje nowy użytkownik z twoim testowym emailem
4. Skopiuj jego `id` (UUID)

### Krok 11: Sprawdź czy profil został utworzony

1. W **Table Editor** wybierz tabelę **profiles**
2. Sprawdź czy istnieje rekord gdzie `owner_id` = UUID z poprzedniego kroku
3. Sprawdź czy pole `email` i `role` są wypełnione

Jeśli profil **nie** został utworzony:
- Sprawdź **Logs** w Supabase Dashboard
- Trigger `on_auth_user_created` może nie działać poprawnie
- Rozwiązanie: Zobacz sekcję "Troubleshooting" poniżej

## Troubleshooting

### Problem: "Invalid redirect URL" mimo dodania URLs w Supabase

**Możliwe przyczyny**:
1. Zmienne środowiskowe Vercel nie zostały zaktualizowane
2. Brak redeployu po zmianie zmiennych
3. Literówka w redirect URLs (np. brak `**` na końcu)

**Rozwiązanie**:
```bash
# Sprawdź zmienne środowiskowe
vercel env ls production | grep NEXT_PUBLIC_SITE_URL

# Powinno zwrócić:
# NEXT_PUBLIC_SITE_URL    https://www.gift.fit    Production

# Jeśli jest inne lub brak - ustaw:
vercel env rm NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_SITE_URL production
# Wartość: https://www.gift.fit

# Redeploy
vercel --prod
```

### Problem: Email potwierdzający nie przychodzi

**Możliwe przyczyny**:
1. Email provider nie jest skonfigurowany w Supabase
2. Email trafia do SPAM
3. Rate limiting

**Rozwiązanie**:
1. Sprawdź folder SPAM
2. Poczekaj 2-3 minuty
3. W Supabase Dashboard → Authentication → Email Templates sprawdź konfigurację
4. Tymczasowo wyłącz email confirmations (tylko dla testów):
   - Authentication → Settings → Enable email confirmations = OFF

### Problem: Profil nie został utworzony w tabeli `profiles`

**Możliwe przyczyny**:
- Trigger `on_auth_user_created` nie działa

**Rozwiązanie**:
```sql
-- Sprawdź czy trigger istnieje (w Supabase SQL Editor):
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Jeśli nie istnieje, uruchom migracje:
-- W terminalu lokalnie:
supabase db push
```

### Problem: Redirect po potwierdzeniu email nie działa

**Możliwe przyczyny**:
- Strona `/auth/callback` nie obsługuje poprawnie callbacku

**Sprawdź**:
1. Czy plik `/src/app/auth/callback/route.ts` lub similar istnieje
2. Logi w Vercel Dashboard → Functions

## Checklist Końcowy

Po wykonaniu wszystkich kroków:

- [ ] Redirect URLs dodane w Supabase Dashboard:
  - [ ] `https://gift.fit/**`
  - [ ] `https://gift.fit/auth/callback`
  - [ ] `https://www.gift.fit/**`
  - [ ] `https://www.gift.fit/auth/callback`
- [ ] `NEXT_PUBLIC_SITE_URL=https://www.gift.fit` ustawione w Vercel Production
- [ ] Aplikacja zredeploy'owana (`vercel --prod`)
- [ ] Testowa rejestracja przeszła pomyślnie
- [ ] Email potwierdzający dotarł
- [ ] Link potwierdzający działa
- [ ] Użytkownik został utworzony w `auth.users`
- [ ] Profil został utworzony w `profiles`
- [ ] Zalogowanie się działa poprawnie

## Podsumowanie Zmian

### W Supabase Dashboard:
1. **Authentication → URL Configuration → Redirect URLs**:
   - Dodano: `https://gift.fit/**`
   - Dodano: `https://gift.fit/auth/callback`
   - Dodano: `https://www.gift.fit/**`
   - Dodano: `https://www.gift.fit/auth/callback`

### W Vercel:
2. **Environment Variables (Production)**:
   - Dodano: `NEXT_PUBLIC_SITE_URL = https://www.gift.fit`

### W Kodzie:
3. **Brak zmian** - kod już prawidłowo obsługuje `NEXT_PUBLIC_SITE_URL`

## Kontakt

Jeśli po wykonaniu wszystkich kroków rejestracja nadal nie działa:

1. Sprawdź logi w Vercel Dashboard → Functions
2. Sprawdź logi w Supabase Dashboard → Logs
3. Otwórz konsolę przeglądarki (F12) i sprawdź szczegóły błędu
4. Zapisz wszystkie komunikaty błędów i skontaktuj się z supportem

---

**Data utworzenia**: 16 listopada 2025
**Wersja**: 1.0
**Status**: Ready for production deployment
