### 1. Definicje (Aktorzy i Modele Danych)

- **User A (Nadawca):** Użytkownik, który *inicjuje* prośbę SG.
- **User B (Odbiorca):** Osoba, która *otrzymuje* prośbę SG (przez SMS/Email).
- **Model `User`:**
  - `is_sms_verified: bool` (Domyślnie: `false`)
  - `free_sg_pool: int` (Domyślnie: `0`)
  - `is_premium: bool` (Domyślnie: `false`)
- **Model `SecretGiverRequest` (Rekord w bazie danych):**
  - `sender_id` (ID Usera A)
  - `recipient_identifier` (Email lub numer telefonu Usera B)
  - `requested_category` (np. "shoe_size")
  - `status` (Enum: `pending`, `approved`, `rejected`, `expired`)
  - `data_payload` (String, np. "XL")
  - `is_anonymous` (Bool)
  - `is_from_circle_member: bool` (Domyślnie: `false`)
  - `expires_at` (Timestamp, 48 godzin po *zatwierdzeniu*)

### 2. Scenariusz 0: Brama Weryfikacyjna (Warunek Konieczny)

- **User Story:** Jako nowy User A w aplikacji webowej, zanim będę mógł wysłać pierwsze SG, muszę zweryfikować swoje konto unikalnym numerem telefonu, aby odblokować darmową pulę.
- **Przepływ (Flow):**
  1. User A (nowe konto, `is_sms_verified: false`) klika przycisk "Wyślij Secret Giver".
  2. **SYSTEM:** Sprawdza `if user.is_sms_verified == false`.
  3. **UI (Modal/Strona):** Wyświetla ekran blokady.
     - **Treść:** "Aby chronić naszą społeczność przed spamem, wymagamy szybkiej weryfikacji SMS. To odblokuje Twoją darmową pulę [X] próśb Secret Giver."
  4. User A podaje numer, otrzymuje i wprowadza kod SMS.
  5. **SYSTEM:** Weryfikuje kod. Ustawia:
     - `user.is_sms_verified = true`
     - `user.free_sg_pool = 3` (Lub 1. To jest **Test Puli H-Hormozi**).
  6. **UI:** "Weryfikacja zakończona! Odblokowałeś [3] darmowe 'strzały' SG."
  7. User A jest przekierowany do Scenariusza 1.

### 3. Scenariusz 1: User A (Nadawca) Wysyła Prośbę SG

- **User Story:** Jako zweryfikowany User A, chcę wysłać prośbę SG, a system musi inteligentnie sprawdzić, czy nie mam już tego rozmiaru w moim "Zaufanym Kręgu".

- **Przepływ (Flow):**

  1. User A klika "Wyślij Secret Giver".

  2. **SYSTEM:** Sprawdza `if user.free_sg_pool > 0 OR user.is_premium == true`.

     - *Jeśli NIE* -> Przejdź do **Scenariusza 4 (Monetyzacja)**.

  3. **UI (Krok 1: Kto?):** User A wprowadza identyfikator Usera B (numer telefonu lub e-mail).

  4. **UI (Krok 2: Co?):** User A wybiera *jedną* kategorię rozmiaru (np. "Rozmiar T-shirta").

  5. **UI (Krok 3: Prywatność):** User A widzi przełącznik "Wyślij anonimowo". 

  6. **UI (Krok 4: Potwierdzenie):** [Button: "Wyślij Prośbę"]

  7. User A klika "Wyślij".

  8. **SYSTEM (Backend) - :** 

     a.  Znajdź konto Usera B na podstawie `recipient_identifier`. 

     b.  Sprawdź, czy User B jest w "Zaufanym Kręgu" Usera A (`checkCircleRelationship`). 

     c.  **IF (Są w Kręgu):** 

     ​	i.   Sprawdź, czy User A *już ma dostęp* do `requested_category` od Usera B w ramach Kręgu (`getSharedSize`). 

     ​	ii.  **IF (User A JUŻ MA ten rozmiar):** * **UI Error (Sprostowanie 4):** "Posiadasz już ten rozmiar! Wejdź do 'Zaufanego Kręgu' i wybierz profil Odbiorcy, aby zobaczyć wszystkie rozmiary, jakie Ci udostępnia." -> **STOP FLOW.** 

     ​	iii. **IF (User A NIE MA tego rozmiaru):** * `is_from_circle_member = true` (dla Scenariusza 2). * Kontynuuj do wysłania (Krok 9). 

     d.  **IF (Nie są w Kręgu):** 

     ​	i.   `is_from_circle_member = false`. 

     ​	ii.  Kontynuuj do wysłania (Krok 9).

  9. **SYSTEM (Backend - Wysyłka):**

     - Tworzy rekord `SecretGiverRequest` (`pending`, `is_anonymous`, `is_from_circle_member`).
     - Jeśli `user.is_premium == false`, dekrementuje `user.free_sg_pool -= 1`.
     - Wysyła **Email / SMS** do Usera B.

### 4. Scenariusz 2: User B (Odbiorca) Odpowiada

#### Scenariusz 2a: User B NIE MA KONTA

1. User B otrzymuje **SMS lub E-mail**.
   - **Treść:** Logika wyboru treści:
     - `IF request.is_from_circle_member == true AND request.is_anonymous == true:` 
       - "Cześć! Ktoś z Twojego *Zaufanego Kręgu* w GiftFit chce kupić Ci prezent-niespodziankę! Potrzebuje Twojego [Kategorii]. Pomóż mu, klikając tutaj: [Unikalny Link]"
     - `ELSE IF request.is_anonymous == true:` (Standardowe anonimowe)
       - "Cześć! Ktoś z Twoich znajomych używa GiftFit, by kupić Ci prezent-niespodziankę! Potrzebuje Twojego [Kategorii]. [Unikalny Link]"
     - `ELSE:` (Jawne)
       - "Cześć! Twój znajomy ([Imię Usera A]) używa GiftFit, by kupić Ci idealny prezent! Potrzebuje Twojego [Kategorii]. [Unikalny Link]"
2. User B klika link. Otwiera się **strona webowa** (responsywna).
3. **UI (Strona Web - Krok 1: Wprowadzenie Danych):**
   - **Nagłówek:** Zależny od treści (np. "Ktoś z Twojego Kręgu Zaufanych...").
   - **Treść:** "Prosi o Twój [Kategoria]. Wpisz poniżej swój rozmiar. Dostęp do rozmiaru wygaśnie za 48 godzin."
   - [Pole tekstowe: "Wpisz swój rozmiar..."]
   - [Button: "Wyślij rozmiar"] [Button: "Odrzuć prośbę"]
4. User B wpisuje rozmiar i klika "Wyślij rozmiar".
5. **SYSTEM (Backend):**
   - Aktualizuje `SecretGiverRequest` (`status = 'approved'`, `data_payload = ...`, `expires_at = ...`).
   - Wysyła **Email / SMS** do Usera A: "Sukces! Otrzymałeś rozmiar od Odbiorcy!"
6. **UI (Strona Web - Krok 2: KONWERSJA ODBIORCY):**
   - **Nagłówek:** "Dziękujemy! Twój rozmiar został wysłany."
   - **Treść:** "Chcesz ułatwić znajomym kupowanie prezentów *na stałe*? **Załóż darmowe konto GiftFit**, aby zapisać wszystkie swoje rozmiary i otrzymać własne **[3] darmowe 'strzały' Secret Giver**."
   - [Button: "Stwórz darmowe konto"] (Przenosi do strony `/signup` aplikacji webowej)
   - [Link: "Nie, dziękuję"]

#### Scenariusz 2b: User B MA KONTO

1. User B otrzymuje **Email / SMS** (oraz powiadomienie w UI aplikacji webowej, jeśli jest zalogowany).
2. Otwiera aplikację webową, przechodzi do panelu powiadomień / "Otrzymane Prośby".
3. **UI:** Widzi kartę z treścią zgodną z logiką ze Scenariusza 2a (np. "Ktoś z Twojego Kręgu Zaufanych prosi...").
4. [Button: "Udostępnij"] [Button: "Odrzuć"]
5. (Reszta flow bez zmian: system sprawdza profil, pyta o rozmiar jeśli go brak, wysyła powiadomienie Email/SMS do Usera A).

### 5. Scenariusz 3: User A Odbiera Dane i "Most" do Kręgu

- **User Story:** Jako User A, po otrzymaniu powiadomienia Email/SMS o sukcesie, loguję się, aby zobaczyć rozmiar i otrzymać propozycję dodania Usera B do "Zaufanego Kręgu".
- **Przepływ (Flow):**
  1. User A otrzymuje Email/SMS "Sukces!" i loguje się do aplikacji webowej.
  2. Przechodzi do zakładki "Moje Prośby" -> "Zakończone".
  3. **UI:** Widzi kartę: "Prośba do [Identifier Usera B] o [Kategoria]".
  4. Klika kartę.
  5. **UI (Dane):** "Oto rozmiar: **[Data Payload]**". (Widoczny przez [xx] godzin).
  6. **UI (MOST RETENCYJNY H-Godin):**
     - **IF (Nie są jeszcze w Kręgu):**
       - **Nagłówek:** "Chcesz mieć ten rozmiar na stałe?"
       - **Treść:** "Zaproś Odbiorcę do swojego 'Zaufanego Kręgu'. Będziecie mogli na stałe udostępniać sobie rozmiary i Listy Marzeń, bez ponownego pytania."
       - [Button: "Zaproś do Kręgu"]
     - **IF (Są już w Kręgu - Sprostowanie 3):**
       - **Nagłówek:** "Chcesz na stałe dodać ten rozmiar do profilu w Kręgu?"
       - **Treść:** "Możesz teraz wysłać jawną prośbę do Odbiorcy o dodanie [Kategorii] do Waszego 'Zaufanego Kręgu'."
       - [Button: "Poproś o dodanie do Kręgu"]

### 6. Scenariusz 4: User A Wyczerpał Pulę (Monetyzacja)

- **Przepływ (Flow):**
  1. User A ( `free_sg_pool = 0`, `is_premium = false`) klika "Wyślij Secret Giver".
  2. **SYSTEM:** Blokuje akcję.
  3. **UI (Modal/Strona Paywall):**
     - **Nagłówek:** "Wykorzystałeś darmowe 'strzały'!"
     - **Treść:** "Aby dalej wysyłać prośby Secret Giver, wybierz opcję dla siebie:"
  4. **UI (Test Monetyzacji H-Hormozi):**
     - **WARIANT A (Tokeny):** 
       - [Button: "Kup pakiet 10 Strzałów SG" - 49.99 PLN]
       - [Button: "Kup pakiet 3 Strzałów SG" - 19.99 PLN]
     - **WARIANT B (Subskrypcja):** 
       - [Button: "Premium: Nielimitowane SG i Kręgi" - 99.99 PLN / rok] (Najlepsza opcja!)
       - [Button: "Premium: Nielimitowane SG i Kręgi" - 19.99 PLN / miesiąc]
  5. User płaci przez Stripe, system aktualizuje `free_sg_pool` lub `is_premium`, flow jest kontynuowany.

### 7. Scenariusze Wyjątkowe

- **User B odrzuci prośbę (Scenariusz 2):**
  - `SecretGiverRequest.status` -> `rejected`.
  - User A otrzymuje Email/SMS: "Odbiorca odrzucił Twoją prośbę."
  - Darmowa pula (`free_sg_pool`) Usera A **NIE JEST** zwracana.
- **User B zignoruje prośbę (limit czasu):**
  - Cron job ustawia `SecretGiverRequest.status` -> `expired` (np. po 72h).
  - User A otrzymuje Email/SMS: "Prośba do Odbiorcy wygasła."
  - Darmowa pula (`free_sg_pool`) Usera A **NIE JEST** zwracana.
- **User A próbuje wysłać SG o rozmiar, który JUŻ MA (Sprostowanie 4):**
  - SYSTEM blokuje akcję w Scenariuszu 1 (Krok 8c-ii).
  - UI: "Posiadasz już ten rozmiar! Sprawdź swój 'Zaufany Krąg'."
- **User A wysyła (anonimowe) SG do kogoś w Kręgu o rozmiar, którego NIE MA:**
  - SYSTEM pozwala na akcję w Scenariuszu 1 (Krok 8c-iii).
  - User B otrzymuje specjalny komunikat o wysokim zaufaniu w Scenariuszu 2a (Krok 1).
- **User B ma zablokowane anonimowe prośby:**
  - User A w Scenariuszu 1 (Krok 5) zaznacza "Wyślij anonimowo".
  - SYSTEM (Krok 8) sprawdza `if user_b.settings.allow_anonymous == false`.
  - **UI (Błąd dla Usera A):** "Ten użytkownik nie akceptuje próśb anonimowych. Odznacz pole 'Wyślij anonimowo', aby kontynuować wysyłanie jako [Imię Usera A]."