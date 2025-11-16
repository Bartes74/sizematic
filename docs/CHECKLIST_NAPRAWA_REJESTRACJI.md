# ✅ Checklist: Naprawa Rejestracji gift.fit

**Cel**: Przywrócenie działania rejestracji użytkowników na https://gift.fit

**Czas wykonania**: ~10 minut

---

## 📋 Krok 1: Supabase Redirect URLs

### Akcja:
1. Otwórz: https://supabase.com/dashboard
2. Zaloguj się
3. Wybierz projekt: **orrekemjkarsmazykemn**
4. W lewym menu: **Authentication**
5. Kliknij: **URL Configuration**
6. W sekcji **Redirect URLs** dodaj:

```
https://gift.fit/**
https://gift.fit/auth/callback
https://www.gift.fit/**
https://www.gift.fit/auth/callback
https://sizematic.vercel.app/**
https://sizematic.vercel.app/auth/callback
```

7. Kliknij **Save** lub **Update**

### Weryfikacja:
- [ ] Wszystkie 6 URLs dodane
- [ ] Brak błędów przy zapisywaniu
- [ ] URLs widoczne na liście

---

## 📋 Krok 2: Vercel Environment Variable

### Opcja A: Przez Vercel Dashboard

1. Otwórz: https://vercel.com/dashboard
2. Znajdź i kliknij swój projekt (szukaj "sizematic" lub "gift.fit")
3. Kliknij **Settings**
4. Kliknij **Environment Variables**
5. Sprawdź czy istnieje `NEXT_PUBLIC_SITE_URL`:
   - **Jeśli istnieje i = `https://www.gift.fit`**: ✅ OK, przejdź do Kroku 3
   - **Jeśli istnieje ale inna wartość**: Kliknij ⋯ → Delete, potem dodaj nową (poniżej)
   - **Jeśli nie istnieje**: Dodaj nową (poniżej)

#### Dodawanie nowej zmiennej:
6. Kliknij **Add New**
7. Wypełnij:
   - **Name**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: `https://www.gift.fit`
   - **Environment**: Zaznacz **TYLKO Production** ✅
8. Kliknij **Save**

### Opcja B: Przez Vercel CLI

```bash
# Zaloguj się
vercel login

# Sprawdź obecną wartość
vercel env ls production | grep NEXT_PUBLIC_SITE_URL

# Jeśli istnieje ale jest zła, usuń:
vercel env rm NEXT_PUBLIC_SITE_URL production

# Dodaj poprawną wartość
vercel env add NEXT_PUBLIC_SITE_URL production
# Wpisz: https://www.gift.fit
# Enter
```

### Weryfikacja:
- [ ] `NEXT_PUBLIC_SITE_URL` istnieje w Production
- [ ] Wartość to dokładnie: `https://www.gift.fit`
- [ ] Tylko Production zaznaczone (nie Preview, nie Development)

---

## 📋 Krok 3: Redeploy

### Opcja A: Przez Vercel Dashboard

1. W projekcie kliknij zakładkę **Deployments**
2. Znajdź najnowszy deployment (pierwszy na liście)
3. Kliknij przycisk **⋯** (trzy kropki) obok niego
4. Wybierz **Redeploy**
5. W dialogu:
   - **Use existing Build Cache**: Wyłącz (OFF) ❌
6. Kliknij **Redeploy**
7. Poczekaj na zakończenie (~2-5 minut)

### Opcja B: Przez Vercel CLI

```bash
# Z katalogu projektu
cd /Users/bartek/Developer/sizematic

# Redeploy production
vercel --prod

# Poczekaj na deployment
```

### Weryfikacja:
- [ ] Deployment zakończony sukcesem
- [ ] Status: **Ready** ✅
- [ ] Brak błędów w logach

---

## 📋 Krok 4: Test Rejestracji

### Akcja:

1. **Otwórz przeglądarkę w trybie incognito**
   - Chrome: Ctrl+Shift+N (Win) / Cmd+Shift+N (Mac)
   - Firefox: Ctrl+Shift+P (Win) / Cmd+Shift+P (Mac)

2. **Przejdź do**: https://www.gift.fit

3. **Kliknij przycisk**: "Zarejestruj się" / "Register"

4. **Wypełnij formularz**:
   - **Wyświetlana nazwa**: Test Użytkownik
   - **Email**: twoj-testowy-email+test@gmail.com
     (użyj +test aby móc powtórzyć z tym samym emailem)
   - **Hasło**: Test1234!@
   - **Potwierdź hasło**: Test1234!@

5. **Kliknij**: "Zarejestruj się" / "Submit"

6. **Otwórz konsolę przeglądarki**: F12 → Console

### Oczekiwane rezultaty:

✅ **Sukces**:
- Pojawia się komunikat: "Sprawdź swoją skrzynkę email" lub podobny
- **Brak błędów** w konsoli przeglądarki
- Email potwierdzający dotarł do skrzynki (sprawdź spam!)

❌ **Błąd**:
- Komunikat: "Invalid redirect URL" → Wróć do Kroku 1
- Komunikat: "User already registered" → Użyj innego emaila
- Inne błędy w konsoli → Zobacz Troubleshooting poniżej

### Weryfikacja:
- [ ] Formularz wysłany bez błędów
- [ ] Komunikat sukcesu wyświetlony
- [ ] Brak błędów w konsoli (F12)
- [ ] Email potwierdzający otrzymany (sprawdź spam!)

---

## 📋 Krok 5: Weryfikacja Email i Login

### Akcja:

1. **Sprawdź email** (może być w spam!)
2. **Kliknij link potwierdzający** w emailu
3. Powinieneś zostać przekierowany do: `https://www.gift.fit/auth/callback`
4. Następnie automatyczne przekierowanie do: `https://www.gift.fit/dashboard`
5. **Jesteś zalogowany!**

### Weryfikacja:
- [ ] Link w emailu działa
- [ ] Redirect do /auth/callback działa
- [ ] Automatyczne zalogowanie działa
- [ ] Widzisz dashboard użytkownika

---

## 📋 Krok 6: Weryfikacja w Bazie Danych

### Akcja:

1. Otwórz Supabase Dashboard: https://supabase.com/dashboard
2. Projekt: **orrekemjkarsmazykemn**
3. W lewym menu: **Table Editor**
4. Wybierz tabelę: **auth.users**
5. Znajdź swojego testowego użytkownika (po emailu)
6. Skopiuj jego **id** (UUID)
7. Przejdź do tabeli: **profiles**
8. Znajdź rekord gdzie **owner_id** = skopiowane UUID
9. Sprawdź czy **email**, **role**, **display_name** są wypełnione

### Weryfikacja:
- [ ] Użytkownik istnieje w `auth.users`
- [ ] Profil istnieje w `profiles`
- [ ] `owner_id` w profilu = `id` usera
- [ ] Wszystkie pola profilu wypełnione poprawnie

---

## 🎯 Podsumowanie

### ✅ SUKCES - Wszystkie kroki zakończone:

- [x] Redirect URLs dodane w Supabase
- [x] `NEXT_PUBLIC_SITE_URL` ustawione w Vercel Production
- [x] Aplikacja zredeploy'owana
- [x] Test rejestracji przeszedł pomyślnie
- [x] Email potwierdzający działa
- [x] Login po potwierdzeniu działa
- [x] User + profil w bazie danych

**Status**: ✅ Rejestracja naprawiona i działa na produkcji!

---

## 🚨 Troubleshooting

### Problem: "Invalid redirect URL"

**Rozwiązanie**:
1. Wróć do Kroku 1
2. Sprawdź dokładnie czy WSZYSTKIE 6 URLs są dodane
3. Zwróć uwagę na:
   - `https://` (nie http)
   - `**` na końcu (dwie gwiazdki!)
   - Brak spacji przed/po URL
4. Save i poczekaj 1-2 minuty
5. Spróbuj ponownie

### Problem: "User already registered"

**Rozwiązanie**: Użyj innego emaila lub:
1. Usuń testowego usera z Supabase
2. Dashboard → Authentication → Users → znajdź email → Delete
3. Spróbuj ponownie z tym samym emailem

### Problem: Email nie przychodzi

**Rozwiązanie**:
1. Sprawdź folder SPAM
2. Poczekaj 2-3 minuty
3. Sprawdź w Supabase Dashboard → Logs czy email został wysłany
4. Tymczasowo wyłącz email confirmations (tylko dla testu):
   - Supabase → Authentication → Settings
   - "Enable email confirmations" → OFF
   - Test rejestracji (powinno zalogować od razu)
   - Włącz z powrotem po teście

### Problem: Profil nie został utworzony

**Rozwiązanie**:
1. Sprawdź Supabase → Logs
2. Szukaj błędów związanych z triggerem `on_auth_user_created`
3. Jeśli brak triggera, uruchom migracje:
   ```bash
   supabase db push
   ```

### Problem: Nadal nie działa!

**Sprawdź**:
```bash
# Vercel env vars
vercel env ls production

# Powinno zawierać:
# NEXT_PUBLIC_SITE_URL    https://www.gift.fit    Production
```

**Logi**:
- Vercel Dashboard → Functions → Logs
- Supabase Dashboard → Logs
- Konsola przeglądarki (F12 → Console)

**Kontakt**: Zapisz błędy z logów i skontaktuj się z supportem

---

## 📚 Dodatkowe Zasoby

- [Szybka naprawa (5 min)](./SZYBKA_NAPRAWA.md)
- [Szczegółowy przewodnik](./FIX_PRODUCTION_REGISTRATION.md)
- [Podsumowanie zmian](../REGISTRATION_FIX_SUMMARY.md)

---

**Ostatnia aktualizacja**: 16 listopada 2025
**Wersja**: 1.0
**Drukuj**: Możesz wydrukować ten checklist i odhaczać kolejne kroki
