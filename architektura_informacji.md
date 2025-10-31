## A. Struktura ekranu (top → bottom)

### A1. Pasek stanu / nagłówek globalny (zastępuje wcześniejszy „Pasek stanu / komunikaty globalne”)

**Co pokazuje (dane/interakcje):**

- Lewo: avatar użytkownika + imię („Cześć, Kasia 👋”).
- Obok avatara/danych: badge planu (`Free`, `Premium`, `Premium+`).
- Prawa strona nagłówka:
  - Przełącznik języka PL / EN (toggler lub menu).
  - Przełącznik trybu jasny / ciemny (ikona słońce/księżyc).
  - (opcjonalnie niewielka ikona synchronizacji/statusu konta).

**Dla kogo / kiedy ważne:**

- Dla wszystkich użytkowników, zawsze przy wejściu.
- Dla użytkowników międzynarodowych / prezent kupowany dla kogoś z innego kraju → łatwa zmiana języka od razu z Home, zamiast szukać w ustawieniach.
- Dla użytkowników, którzy wolą dark mode niezależnie od ustawień systemowych (estetka, dyskrecja przy danych ciała).

**Stany:**

- Normalny:
  - Avatar + „Cześć, Kasia”.
  - Badge planu, np. „Free”.
  - Ikona języka (PL / EN).
  - Ikona Light/Dark (np. księżyc jeśli aktualnie jasny).
- Premium-lock:
  - Jeśli user jest w Free i badge to „Free”, badge jest klikalny i prowadzi do ekranu planów / upsell (“Dowiedz się, co daje Premium”).
- Brak danych (nowy user):
  - Zamiast imienia może być placeholder typu „Witaj 👋”.
  - Badge planu nadal widoczny.

**Powód biznesowy:**

- Badge planu jest zawsze widoczny = stała, cicha powierzchnia upsellu, bez wpychania paywalla w środku tasku.
- Przełącznik języka i motywu na wierzchu zmniejsza tarcie supportowe („gdzie się zmienia język?”), co ma wpływ na adopcję poza PL.
- Estetyka (dark mode) to czynnik „czuję się komfortowo z wrażliwymi danymi”, co zwiększa skłonność do uzupełniania sekcji takich jak bielizna / biżuteria.

> WAŻNE: Ten nagłówek jest teraz elementem product identity. To nie jest tylko status – to kontrol panel użytkownika.

------

### A2. Skrzynka akcji natychmiastowych (Quick Actions)

Bez zmian w logice i stanach:

- „Dodaj pomiar ciała”
- „Przepisz z metki”
- „Wyślij link prezentowy”

- link tekstowy „Zobacz moje rozmiary”

------

### A3. Moje rozmiary (Szybki podgląd rozmiarów)

Bez zmian — widok zakłada aktualne dane synchronizowane z Supabase.

- Karty kategorii rozmiarowych (ja / partner / dziecko) z ostatnim znanym rozmiarem: koszulki, spodnie W/L, buty (np. 44.5 EU), pierścionek (17.3 mm), itd.
- Dalej obowiązują:
  - stan „brak danych” → karty zachęcające do dodania pierwszych wymiarów;
  - stan „nieaktualne dane” → badge „sprawdź teraz”;
  - premium-lock → ghost karta „Dodaj rozmiary partnera — dostępne w Premium”.

------

### A4. Prezenty i okazje

Bez zmian.

Sekcja nadal pokazuje:

- zbliżające się urodziny / rocznice,
- aktywne linki prezentowe (ile wyświetleń, do kiedy ważny, przycisk [Kopiuj link] / [Unieważnij]),
- oczekujące prośby o dostęp (Secret Giver) z szybkimi akcjami [Zezwól tylko na biżuterię] / [Odrzuć].

Tu nadal trzymamy subtelne upselle typu:

- „W Premium+ możesz zabezpieczyć dostęp hasłem i dłuższą ważnością linku”.

------

### A5. Mój Krąg („Kto zna Twoje rozmiary”)

Bez zmian poza usunięciem stanów zależnych od połączenia.

Najważniejsze elementy zostają:

- Lista 2–3 osób z dostępem, każda z listą kategorii, do których ma wgląd (np. „Marek · ma dostęp do: Koszulki, Spodnie, Buty”).
- „+ Dodaj osobę” jako CTA.
- Gdy użytkownik osiągnął limit w planie Free:
  - karta „+ Dodaj osobę” jest półprzezroczysta i mówi:
     „Masz już 1 osobę w Kręgu. W Premium możesz dodać kolejne 3.”

To zostaje, bo to jest idealne miejsce do konwersji na plan płatny.

------

### A6. Podsumowanie tygodnia / aktywność („Ostatnia aktywność”)

Bez zmian funkcjonalnych, poza tym, że nie ma już statusu „ostatnia synchronizacja”.

Wciąż:

- Pokazujemy kontrolę i bezpieczeństwo: „Ania podejrzała Twój link prezentowy 2 razy w tym tygodniu.”
- To miejsce może mieć element premium: „W Premium+ zobaczysz kto dokładnie i kiedy oglądał Twoje rozmiary.”

------

### A7. Stopka / nawigacja główna

Bez zmian:

- Home · Rozmiary · Prezenty · Krąg · Ustawienia
- Home zawsze jako pierwszy tab.

------

## B. Priorytetyzacja treści

Kolejność ważności ekranu pozostaje:

1. Pasek stanu / nagłówek globalny (z awatarem, planem, językiem PL/EN, light/dark).
2. Skrzynka akcji natychmiastowych.
3. Początek „Szybki podgląd rozmiarów”.
4. Prezenty i okazje.
5. Mój Krąg.
6. Ostatnia aktywność.

Komunikaty statusu koncentrują się na dostępności funkcji (limity planu, brak danych) i nie duplikują informacji o połączeniu.

Reszta zasad priorytetyzacji bez zmian:

- Above the fold muszą być:
  - nagłówek z przełącznikami,
  - quick actions,
  - szybki podgląd rozmiarów.
- Rzeczy „planowania / relacji społecznych” mogą być poniżej pierwszego scrolla (Prezenty, Krąg).
- Ostatnia aktywność i szczegóły prywatności mogą być nawet zwinięte/akordeon.

------

## C. Copy i etykiety UI (zmiana dotyczy nagłówka)

Doprecyzowanie nagłówka:

- Lewa strona:
  - Logo
  - Nazwa: SizeHub
- Prawa strona:
  - „Cześć, Kasia 👋”
  - pod spodem mniejszym: „Plan: Free” (klikalne)
  - PL / EN (dwuliterowy przełącznik np. [PL] [EN] lub globe-icon → menu)
  - ☀️ / 🌙 (ikonka zmiany motywu)

Reszta copy pozostaje:

- „Przepisz z metki” zamiast „Dodaj rozmiar z metki”
- „Wyślij link prezentowy”
- „Szybki podgląd rozmiarów”
- „Prezenty i ważne daty”
- „Twoje następne kroki”
- „Kto zna Twoje rozmiary”
- „Ostatnia aktywność”

Upsell planu pozostaje miękki:

- „Masz już 1 osobę w Kręgu. W Premium możesz dodać kolejne 3.”
- „W Premium+ możesz zabezpieczyć link hasłem i unieważnić dostęp jednym tapnięciem.”

------

## D. Prywatność i poczucie kontroli

Założenia pozostają bez zmian:

- W „Kto zna Twoje rozmiary” każda osoba ma jawnie wypisane kategorie, do których ma dostęp. Zero domysłów.
- Przy kategoriach intymnych (bielizna / biustonosz) komunikujemy „(tylko Ty)” dopóki nie zostanie to świadomie udostępnione.
- W „Prezenty i ważne daty” przy aktywnym linku prezentowym zawsze jest przycisk wprost nazwany np. „Unieważnij teraz”, żeby użytkownik widział natychmiastową kontrolę nad dostępem.
- W wariancie Premium+ możemy komunikować bezpieczeństwo zamiast „funkcja premium”:
   „W Premium+ możesz jednym tapnięciem zablokować dostęp do swoich rozmiarów.”

To nie brzmi jak sprzedaż, tylko jak ochrona.