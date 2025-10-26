# Lista konfiguracji Supabase

Uzupełniaj kolejne pola i odhaczaj zadania, gdy tylko uzyskamy potrzebne dane. Po każdej sekcji znajdziesz instrukcję krok po kroku, jak zdobyć konkretne informacje. Zacznij od sekcji 1; pozostałe uzupełnimy po Twoim potwierdzeniu.

- [x] **1. Identyfikator projektu (`project_ref`) i region**
  - Otwórz [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects) i zaloguj się na konto organizacji SizeSync.
  - Wybierz projekt, który ma obsłużyć środowiska aplikacji (jeśli jeszcze go nie masz, kliknij „New project” i przejdź przez kreator – wybierz nazwę, region oraz plan cenowy; po utworzeniu wróć do pulpitu).
  - Po wejściu do projektu spójrz na adres URL w przeglądarce – będzie w formacie `https://supabase.com/dashboard/project/<project_ref>`. Skopiuj fragment `<project_ref>` (ciąg liter/cyfr).
  - Region znajdziesz na karcie „Settings → General → Infrastructure”. Zanotuj nazwę regionu (np. `eu-central-1`).
  - Zapisz obie wartości w bezpiecznym miejscu i odhacz to zadanie.

    ```
    project_ref: bfsfuojhdfycungqxtfb
    region: East US (Ohio)
    ```

- [x] **2. Klucze API (anon i service role)**
  - W tym samym projekcie Supabase przejdź do menu bocznego i kliknij `Settings`.
  - W sekcji ustawień wybierz `API`. Otworzy się strona z identyfikatorami i kluczami projektu.
  - Znajdziesz tam dwa interesujące nas pola:
    - **`anon public` key** (klucz publiczny, używany po stronie klienta – trafi na `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
    - **`service_role` key** (klucz z pełnymi uprawnieniami, tylko dla środowiska serwerowego – trafi na `SUPABASE_SERVICE_ROLE_KEY`).
  - Kliknij ikonę kopiowania przy każdym z kluczy i zapisz je w bezpiecznym miejscu (menedżer haseł / dokument konfiguracyjny).
  - Wklej je też – w formie notatki – do `SUPABASE_CHECKLIST.md` (możesz pominąć pełne wartości, jeśli wolisz zachować je całkiem prywatnie; wystarczy zaznaczyć, że są zebrane).
  - Po zapisaniu obu kluczy odhacz punkt 2 w checklistcie.

    ```
    anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc2Z1b2poZGZ5Y3VuZ3F4dGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzMwNTAsImV4cCI6MjA3NjY0OTA1MH0.BXa7Ol3Td8Ng3r2XPV1izy-nb0WXwn63e_merjdrsus
    service role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc2Z1b2poZGZ5Y3VuZ3F4dGZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3MzA1MCwiZXhwIjoyMDc2NjQ5MDUwfQ.j7xTSTYRFwsfQjkVV56nTHJU68WWIvMIlL0Yun7iTJs
    ```
- [x] **3. Hasło bazy danych i strategia branchy**
  - Hasło bazy zostało zapisane lokalnie (`Dunczyk1974!`), przeznaczone do `SUPABASE_DB_PASSWORD`.
  - Strategia branchy: pojedynczy branch `main` (bez dodatkowych branchy deweloperskich).
- [x] **4. Konfiguracja auth (metody logowania, redirecty)**
  - Włączone metody: e-mail (magic link/hasło), bez dodatkowych dostawców OAuth na ten moment.
  - Site URL: `http://localhost:3000`. Dodatkowe redirecty zostaną dodane po wdrożeniu na Vercel.
- [x] **5. Buckety storage i limity**
  - Utworzone buckety (wszystkie prywatne):
    - `profile-assets` – limit 10 MB (profilowe skany/metki).
    - `shared-link-payloads` – limit 25 MB (payloady dla Prezentowego linku).
    - `wishlist-media` – limit 25 MB (obrazki do wishlisty).
- [x] **6. Dostawcy e-mail/SMS dla auth i powiadomień**
  - Na etapie MVP pozostajemy przy domyślnym serwerze e-mail Supabase (brak zewnętrznych providerów/SMS).
- [x] **7. Zmienne Edge Functions + harmonogramy CRON**
  - Zaplanowane harmonogramy:
    - `notify-contextual-events` – codziennie 08:00 UTC (powiadomienia dzienne).
    - `digest-weekly` – poniedziałki 08:00 UTC (tygodniowy digest).
  - Wymagane środowisko (po wdrożeniu funkcji): `SUPABASE_SERVICE_ROLE_KEY` (już mamy), docelowo rozszerzymy o Stripe/Postmark, gdy funkcje będą wdrażane.
- [x] **8. Klucze Stripe i konfiguracja webhooków**
  - Klucze testowe zapisane lokalnie (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`).
  - Webhook endpoint utworzony (placeholder URL) i zapisany `STRIPE_WEBHOOK_SECRET`.
  - Produkty/ceny zostaną zdefiniowane na etapie implementacji billingów (ID zanotowane w Stripe).
- [x] **9. Wymagania compliance/logów**
  - Retencja logów: 30 dni (domyślnie w Supabase).
  - Backupy: codzienne snapshoty (do skonfigurowania w Supabase, następnie weryfikacja eksportów).
  - RODO/GDPR: odłożone do etapu produkcji; MVP skupia się na funkcjonalności.
  - Audyt: brak dodatkowego audytu na MVP, zaplanować rozszerzenia na produkcję.
  - Bezpieczeństwo: wymóg braku „dziur” już na MVP; klucze przechowywane w managerze haseł, rotacja wg wewnętrznych zasad.
