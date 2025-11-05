# 📱 Sinch SMS - Przewodnik Konfiguracji

## Krok 1: Logowanie do Sinch Dashboard

1. Przejdź do: https://dashboard.sinch.com/
2. Zaloguj się (masz już konto)

## Krok 2: Konfiguracja SMS Service

### A. Pobierz Service Plan ID

1. W menu bocznym kliknij **SMS**
2. Kliknij **Overview** lub **Service Plans**
3. Znajdź swój Service Plan (lub utwórz nowy jeśli nie masz)
4. **Skopiuj Service Plan ID** (format: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)

Przykład:
```
Service Plan ID: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### B. Wygeneruj API Token

1. W menu bocznym kliknij **APIs**
2. Kliknij **Access Keys**
3. Kliknij **Create New Key** (lub użyj istniejącego)
4. Nadaj nazwę: `GiftFit Production`
5. **Skopiuj API Token** (będzie pokazany tylko raz!)

Przykład:
```
API Token: Bearer_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Krok 3: Gdzie Dodać API Key?

### Opcja A: Przez skrypt automatyczny (POLECANE)

```bash
cd /Users/bartek/.cursor/worktrees/sizematic/r296y
./vercel-env-setup.sh
```

Skrypt zapyta Cię o:
- `SINCH_SERVICE_PLAN_ID` - wklej skopiowany Service Plan ID
- `SINCH_API_TOKEN` - wklej skopiowany API Token

### Opcja B: Ręcznie przez Vercel CLI

```bash
# Service Plan ID
vercel env add SINCH_SERVICE_PLAN_ID production
# Wklej wartość i naciśnij Enter

# API Token
vercel env add SINCH_API_TOKEN production
# Wklej wartość i naciśnij Enter
```

### Opcja C: Przez Vercel Dashboard

1. Przejdź do: https://vercel.com/dashboard
2. Wybierz projekt **r296y** (lub GiftFit)
3. Kliknij **Settings** → **Environment Variables**
4. Dodaj zmienne:
   - Name: `SINCH_SERVICE_PLAN_ID`, Value: `[twój Service Plan ID]`
   - Name: `SINCH_API_TOKEN`, Value: `[twój API Token]`
5. Wybierz environment: **Production**
6. Kliknij **Save**

## Krok 4: Testowanie

### Test lokalny (opcjonalny)

1. Dodaj do `.env.local`:
```bash
SINCH_SERVICE_PLAN_ID=twój_service_plan_id
SINCH_API_TOKEN=twój_api_token
```

2. Uruchom dev server:
```bash
pnpm dev
```

3. Przejdź do Secret Giver i spróbuj zweryfikować numer telefonu

### Test produkcyjny

Po deployment na Vercel:
1. Przejdź do `/dashboard/secret-giver`
2. Kliknij "Wyślij prośbę Secret Giver"
3. Jeśli nie jesteś zweryfikowany, pojawi się modal weryfikacji SMS
4. Podaj swój numer telefonu
5. Sprawdź czy otrzymałeś SMS z kodem

## 📊 Monitoring

### Sinch Dashboard - Sprawdzanie Statystyk

1. Przejdź do **SMS** → **Logs**
2. Zobaczysz historię wysłanych wiadomości:
   - Status (delivered/failed)
   - Numer odbiorcy
   - Timestamp
   - Koszt

## 💰 Pricing

Sinch SMS kosztuje:
- ~0.04-0.10 PLN za SMS w Polsce (zależnie od operatora)
- Płatność prepaid lub postpaid

**Wskazówka**: Załaduj konto na Sinch aby móc wysyłać SMS.

## ⚠️ Troubleshooting

### Błąd: "SMS service not configured"
- Sprawdź czy `SINCH_SERVICE_PLAN_ID` i `SINCH_API_TOKEN` są ustawione
- Zweryfikuj w Vercel Dashboard → Settings → Environment Variables

### Błąd: "Failed to send SMS"
- Sprawdź logi w Sinch Dashboard
- Upewnij się że masz środki na koncie Sinch
- Sprawdź czy numer telefonu jest w formacie E.164 (np. +48123456789)

### Rate Limiting
Aplikacja limituje do 3 kodów/godzinę per użytkownik aby zapobiec nadużyciom.

## ✅ Gotowe!

Po skonfigurowaniu Sinch, użytkownicy będą mogli:
- ✅ Weryfikować swój numer telefonu przez SMS
- ✅ Otrzymać 2 darmowe "strzały" Secret Giver
- ✅ Wysyłać prośby o rozmiary

