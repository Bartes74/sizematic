# UI — Projekt interfejsu użytkownika (MVP)


---



---

### Strona 1


SizeHub — Projekt interfejsu użytkownika (MVP)
Kompletny projekt UI dla aplikacji PWA (Next.js + React + Tailwind), zgodny z architekturą
measurement‑first  (ZPR),  funkcjami  udostępniania  (Zaufany  Krąg,  Secret  Giver),
Prezentowym linkiem oraz powiadomieniami kontekstowymi. Dokument
zawiera:  informację  architektoniczną,  mapę  nawigacji,  kluczowe  ekrany  i  przepływy,
komponenty,  copy  &  i18n,  stany  (empty/error/loading),  dostępność,  paywalle  i  logikę
planów.
1) Założenia projektowe
Cel produktu:  ułatwienie zarządzania rozmiarami (measurement‑first, EN 13402) oraz wygodne
udostępnianie ich rodzinie/przyjaciołom i kupującym prezenty.
Platforma:  PWA z czytelnym oznaczaniem funkcji płatnych lub wymagających dodatkowych uprawnień (SG,
tworzenie linków, płatności).
Tonality & mikro‑copy:  spokojny, pomocny, bez presji; krótkie komunikaty i jedna
rekomendowana akcja.
Dwa tryby UI:  mobile‑first (bottom‑nav) i desktop (side‑nav) — wspólny AppShell.
Gating planów:  Free / Premium / Premium+; jasne „co dostajesz więcej” + szybkie paywalle przy
działaniach przekraczających limit.
2) Design System (light/dark)
## 2.1 Kolory (tokens Tailwind)
Tło: bg.light #F7F7F7  / bg.dark #111315
Tekst: text.light #1F2937  / text.dark #E7E7E7
## Primary: #4C5B5C
## Accent (CTA): #E07A5F
## Success: #81B29A
Border: border.light #E5E7EB  / border.dark #2A2F33
Aplikowanie  motywu:  <html  class="dark">  +  przełącznik  (system/light/dark).
Kontrasty: WCAG 2.1 AA.
## 2.2 Typografia i rytm
Font: Inter  lub DM Sans .
Skale: h1 28–32 / h2 22–24 / h3 18–20 / body 15–16 / caption 12–13.
Duże odstępy, „powietrze”, brak wizualnego szumu, zaokrąglenia rounded-2xl , cienie
shadow-soft  (subtelne).
## 2.3 Ikony i ilustracje
Ikony: lucide-react .
Ilustracje: proste, geometryczne, w neutralnej palecie (akcent tylko akcentowym kolorem).•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
1


---

### Strona 2


## 2.4 Stany i feedback
Toasty  (success/error/warn) z aria‑live.
Badges  (TTL, max_views, confidence, official/derived) i Progress  (paski dla limitów/odliczeń).
Skeletony  dla list; EmptyState  z jedną akcją.
3) Informacja architektoniczna (frontend)
Routing:  Next.js App Router ( /app), segmenty: (auth), (protected) .
Stan:  React Query (server), Zustand (UI/local), i18n (PL/EN).
Synchronizacja:  React Server Components + Supabase SSR; mutacje przez Server Actions.
A11y:  Headless UI (Dialog, Listbox, Menu), focus management, aria-* kompletne.
4) Architektura nawigacji i IA (5 zakładek)
## 4.1 AppShell
Header:  logo, global search (marki/konwersje), przycisk powiadomień, avatar .
Bottom‑nav (mobile):  Home · Profil · Krąg · Prezenty · Ustawienia.
Side‑nav (desktop):  ikony + etykiety, sekcje narzędziowe pod spodem (Konwersje, Linki).
## 4.2 Mapowanie ekranów (ścieżki)
A. Autoryzacja i onboarding
/auth/login  — e‑mail/hasło, Google/Apple; stany: loading/błąd.
/onboarding  — slajdy + szybka konfiguracja: język, jednostki, powiadomienia, motyw; CTA →
„Dodaj wymiary” / „Dodaj metkę”.
B. Home (hub) /home — karty skrótów (Dodaj wymiary, Dodaj metkę, Konwersje, Utwórz link).
Sekcje: Nadchodzące okazje · Aktywność Kręgu.
C. ZPR (profil) /profile  — zakładki: Odzież (tops/bottoms/outerwear/underwear), Buty,
Akcesoria, Biżuteria. Widoki: lista wymiarów z jednostkami, „Edytuj”, „Historia zmian”, „Dodaj
metkę”.
/profile/measure  — formularz z wizualnymi wskazówkami (mini‑rysunki, tooltipy).
/profile/label  — kreator „metki”: Marka → Kategoria → Etykieta → Wynik
(Auto‑konwersje + confidence).
D. Marki i Konwersje /brands  (lista, filtry) · /conversions  (metka lub pomiary → tabela
konwersji + badge official/derived).
E. Krąg i Udostępnianie /circle  (członkowie, limity planu, zaproszenia) · /sharing  (reguły
per kategoria, data wygaśnięcia, podgląd „co widzi adresat”).
F. Secret Giver /sg/request  (adresat, kategoria, czas → Checkout Stripe) · /sg/inbox
(Akceptuj/Odrzuć; stany pending/approved z odliczaniem/denied/expired; baner o blokadzie SG
wg planu).
G. Prezentowy link /links (lista: status aktywny/wygasły/jednorazowy, licznik odsłon; Kopiuj ·
Revoke · Przedłuż) · /links/create  (scope, kategorie, TTL, max_views, one_time, [Premium+]:
hasło) · /s/{token}  (publiczny widok gościa: wishlist + bazowe rozmiary, obsługa hasła, licznik
odsłon).
H. Okazje i Wishlista /events  (kalendarz miesiąc/lista) · /wishlist  (kafle; tytuł/link/
kategoria/notatki).•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
2


---

### Strona 3


I. Ustawienia /settings  — konto, język, jednostki, motyw (system/light/dark),
powiadomienia (granularnie), plan/płatności, prywatność (SG blokada, aktywne linki), eksport/
konto.
5) Kluczowe ekrany — opis i layout
## 5.1 Home (hub)
Hero karty skrótów:  1) „Dodaj wymiary” 2) „Dodaj metkę” 3) „Konwersje” 4) „Utwórz Prezentowy
link”.
Sekcja „Nadchodzące okazje”:  lista z datą, CTA „Utwórz link” / „Dodaj do wishlisty”.
„Aktywność Kręgu”:  licznik wyświetleń profilu/wishlisty (bez PII), skróty do reguł.
## 5.2 ZPR — widok kategorii
Lista pól (cm/in) z przełącznikiem jednostek; przycisk Edytuj  otwiera form.
Historia zmian  jako sheet/modal z możliwością przywracania.
Empty state:  ilustracja + dwie duże akcje „Zacznij od pomiarów” / „Zacznij od metki”.
## 5.3 Kreator „Dodaj metkę” (3 kroki)
1) Marka : wyszukiwarka + lista popularnych.
2) Kategoria : chipsy (tops/bottoms/shoes/…); opcjonalnie „target” (women/men/kids).
3) Etykieta : lista wartości (np. M / 42 / US 8).
Wynik:  panel  Auto‑konwersje :  tabela  Top  5  marek  z  etykietą  i  confidence ;  link  „Zobacz
wszystkie” (pełny ekran konwersji). Badge Źródło: official/derived  z tooltipem.
## 5.4 Ekran Konwersji
Wejście:  przełącznik METKA / POMIARY .
Wyjście:  tabela „Marka · Region · Label · Confidence”; filtrowanie po regionie (EU/US/UK);
ostrzeżenia dla brakujących marek; CTA „Zapisz do ZPR” / „Dodaj do wishlisty”.
## 5.5 Zaufany Krąg & Reguły
/circle : lista członków z limitem wg planu; przycisk „Zaproś” (e‑mail/kod).
/sharing : tabela reguł (kategoria → przełącznik Read, data wygaśnięcia, podgląd).
Podgląd adresata:  mini‑okno „co zobaczy” (tylko do odczytu).
Paywall hint:  po przekroczeniu limitu członków (Free>1, Premium>4) — lekki modal z
porównaniem planów.
## 5.6 Secret Giver (SG)
/sg/request : formularz (adresat, kategoria, czas w godzinach, podgląd prośby) → Checkout
Stripe .
/sg/inbox : skrzynka odbiorcy z kartami próśb; akcje: Akceptuj / Odrzuć; karta „approved”
pokazuje zegar do wygaśnięcia oraz CTA „Przejdź do profilu (kategoria)”.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
3


---

### Strona 4


Baner blokady SG:  jeśli właściciel ma włączoną blokadę — jasny opis i odnośnik do ustawień
planu.
## 5.7 Prezentowy link
/links/create : kreator z presetami wg planu  (Free/Premium/Premium+): zakres (wishlist +
bazowe rozmiary), wybór kategorii, TTL, max_views , one_time , [Plus] hasło ; podgląd payloadu;
przycisk Utwórz  → ekran sukcesu z Kopiuj .
/links : lista linków jako LinkCard  (ikona statusu, TTL badge , progress max_views , licznik
odsłon, akcje: Kopiuj · Przedłuż · Revoke).
Widok publiczny /s/{token} : nagłówek z nazwą linku, sekcje Wishlista  i Bazowe rozmiary
(tylko zakres udostępniony), licznik odsłon; dla Premium+ — ekran hasła.
## 5.8 Okazje i Wishlista
/events:  widok miesiąca + lista; pigułki dat; formularz dodania (tytuł, data, coroczne, notatki).
/wishlist:  kafle z tytułem, URL, kategorią, notatkami; brak miniatur ≠ błąd.
## 5.9 Ustawienia
Konto:  e‑mail, OAuth, eksport/usuń konto.
Język/jednostki/motyw:  przełączniki natychmiastowe.
Powiadomienia:  granularne opt‑in (Okazje, ZPR, Krąg, Linki, SG, Digest) + Godziny ciszy .
Plan i płatności:  porównanie planów (różnice, cena), zarządzanie subskrypcją.
Prywatność:  włącz/wyłącz blokadę SG, lista aktywnych linków (REVOKE/Extend), polityki
udostępniania.
6) Przepływy (UX bez tarcia)
## 6.1 „Dodaj metkę” → Auto‑konwersje
1) Otwórz kreator → 2) Wybierz markę → 3) Wybierz kategorię → 4) Wybierz etykietę → 5) Wynik  z Top 5
marek i confidence → 6) CTA: „Zapisz do ZPR” / „Przejdź do pełnych konwersji”.
Edge cases:  brak metadanych dla marki → komunikat + obejście (wybór innej marki lub tryb „pomiary”).
## 6.2 Tworzenie Prezentowego linku
Wybierz preset planu  (wyjaśnienie limitów i możliwości).
Ustaw TTL, max_views , one_time , [Plus] hasło .
Podgląd — co trafi do odbiorcy.
Po utworzeniu: success screen  + „Kopiuj”, skrót do „Przedłuż” i „Udostępnij”.
## 6.3 Secret Giver — żądanie i zgoda
Darczyńca: formularz → Checkout → status pending .
Odbiorca: powiadomienie  + karta prośby (opis: kto/co/na jak długo) → Akceptuj/Odrzuć .
Po akceptacji: dostęp wyłącznie do wskazanej kategorii przez X godzin (zegarek odliczający);
zakończenie → automatyczne wygaśnięcie.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
4


---

### Strona 5


## 6.4 Udostępnienia w Kręgu (per kategoria)
Tabela reguł: kolumna Kategoria  + przełącznik Read + opcjonalna data wygaśnięcia.
„Podgląd adresata” — tryb tylko do odczytu.
Limity członków i reguł egzekwowane per plan.
## 6.5 Powiadomienia
Powiadomienia: progi (urodziny 21/7/3/1; przeterminowane wymiary 12/24m; wzrost dzieci co
3m; wygasanie linków 72/48/24h; SG natychmiast/24h).
7) Komponenty (biblioteka UI)
## 7.1 Nawigacja
AppShell , BottomNav/SideNav , TabBar  (sekcje ZPR), Breadcrumbs  (narzędzia: konwersje,
linki).
## 7.2 Formularze
Field  (label, helper , error), NumberField  z jednostkami (cm/in), Select  (marka/kategoria/
rozmiar), Toggle  (powiadomienia, dark mode, one_time), Stepper  (kroki kreatorów), DatePicker
(okazje).
## 7.3 Karty i listy
Card/ClickableCard , ListItem  (ikona/awatar + akcje w Menu ), DataList  (para etykieta →
wartość), KeyValue  dla historii zmian.
## 7.4 Dialogi i informatory
Modal  (zgody SG, paywall), Drawer/Sheet  (historia zmian), Toast , Tooltip , HoverCard .
## 7.5 Specjalne
ConversionTable , RangeBadge , LinkCard  (TTL/max_views/licznik), CircleMember ,
ShareRuleRow , SGRequestItem  (status, czas do wygaśnięcia).
## 7.6 Stany aplikacyjne
EmptyState , ErrorState  (z Retry), OfflineBadge , LoadingSpinner .
8) Paywalle i logika planów (UI)
W Kręgu:  po kliknięciu „Zaproś” gdy limit przekroczony → modal porównania planów (Free: 1,
Premium: 4, Premium+: ∞) + CTA „Wybierz plan”.
Prezentowy link:  presety i limity (TTL, max_views, hasło tylko w Premium+); w liście Linków
badge z poziomem planu.•
•
•
•
•
•
•
•
•
•
•
•
•
5


---

### Strona 6


Secret Giver:  token zawsze płatny (20 PLN). Dla odbiorcy — baner blokady SG  (Free/Premium:
włączona po opłacie 5 PLN/m; Premium+: w cenie).
9) Stany: loading / empty / error
Offline:  banner + piktogram; ZPR edytowalny, narzędzia online (SG, linki) → disabled z tooltipem.
Loading:  skeletony list, disabled CTA ze spinnerem.
Empty:
ZPR pusty → „Zacznij od pomiarów / metki” (2 przyciski).
Brak członków Kręgu → „Zaproś pierwszą osobę” + korzyści.
Brak powiadomień → informacja o ciszy nocnej / konfiguracji kanałów.
Error:  delikatny ekran błędu z „Spróbuj ponownie” i krótkim opisem (bez technikaliów).
## 10) Dostępność (WCAG 2.1 AA)
Kontrast CTA i tekstów; focus‑visible na wszystkich elementach interaktywnych.
Pełna nawigacja klawiaturą (modale, menu, listy); ESC zamyka dialogi (focus‑trap).
Opisy aria‑label dla ikon, live region  dla liczników (odliczanie SG).
prefers-reduced-motion : redukcja animacji.
## 11) i18n i mikro‑copy (PL/EN)
## 11.1 Namespace’y
auth, onboarding, profile, labels, conversions, circle, sharing, sg, links,
events, wishlist, settings, common .
## 11.2 Przykładowe mikro‑kopie
Powiadomienie SG:
PL: „{name} prosi o dostęp do Twoich rozmiarów w kategorii {category} na {hours} h.”
EN: “{name} requests access to your {category} sizes for {hours} hours.”
Wygasanie linku:
PL: „Twój Prezentowy link wygaśnie za {hours} h. Przedłużyć?”
EN: “Your Gift Link expires in {hours}h. Extend it?”
Konwersje:
PL: „Na podstawie tabel marki {brand} i Twoich wymiarów.”
EN: “Based on {brand} size charts and your measurements.”
12) Noty o performance i jakości UX
TTI < 2,5 s (3G Fast), initial JS < 250–300 kB (code‑split/SSR).
Listy marek/map wirtualizowane (5–10k wierszy płynnie).
## 60 fps interakcje na telefonach średniej klasy.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
6


---

### Strona 7


13) Mały style‑guide ekranów (wireframe’y opisowe)
Karty skrótów : grid 2×2 (mobile), 4 w rzędzie (desktop).
Tabela konwersji : sticky header , kolumny: Marka · Region · Label · Confidence; sort po marce/
regionie/pewności.
LinkCard : tytuł, scope, badge planu, chip TTL (D:HH), pasek max_views (użycia/limit), przyciski:
Kopiuj | Przedłuż | Revoke (menu kebab na mobile).
SGRequestItem : avatar proszącego, chips kategoria, opis czasu, duże przyciski Akceptuj/Odrzuć;
po akceptacji licznik (aria‑live) + CTA przejścia do kategorii.
14) Ekrany płatności i paywall copy
Porównanie planów  (modal lub full‑page): lista różnic (Krąg, Linki, Powiadomienia, Blokada SG,
Priorytetowe wsparcie).
Checkout SG : krótkie wyjaśnienie celu („Jednorazowy token, 20 PLN”), link do polityki
prywatności; po sukcesie — ekran „Prośba wysłana”.
Blokada SG (abonament) : w Ustawieniach karta „Prywatność”: przełącznik „Zablokuj Secret
Giver” + przypis o koszcie (Free/Premium) lub „w cenie” (Premium+).
## 15) QA checklist (UI)
Focus‑trap i ESC w modalach.
Loading state dla każdej akcji (disabled + spinner).
Responsywność od 320 px; desktop z side‑nav.
Brak twardo zakodowanych stringów (PL/EN).
Linki REVOKE/EXTEND dostępne z klawiatury.
i18n: formaty dat (PL: DD.MM, EN: MMM D), jednostki cm/in niezależne od języka.
## 16) Załącznik: Teksty stanów (PL/EN)
Offline:
Empty ZPR:
PL: „Zacznij od pomiarów albo metki — to 2 min.”
EN: “Start with measurements or a label — 2 minutes.”
Brak członków Kręgu:
PL: „Zaproś pierwszą osobę. Udostępniaj tylko wybrane kategorie.”
EN: “Invite your first contact. Share only selected categories.”
Wygaśnięcie linku:
PL: „Link wygasł. Utwórz nowy?”
EN: “This link has expired. Create a new one?”•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
7


---

### Strona 8


17) Następne kroki (propozycja)
Akceptacja IA i kluczowych przepływów (metka, SG, link).
Przygotowanie biblioteki komponentów (Tailwind) zgodnie z tokenami.
Prototyp 3 ekranów high‑fidelity: Home, Kreator metki, Linki (lista + create).
Ustalenie mikro‑copy PL/EN (plik i18n) i testy dostępności.
Koniec dokumentu.1.
2.
3.
4.
8