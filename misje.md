# 1) Architektura funkcji „Misje”

**Komponenty UI**

- Ekran „Misje”: zakładki `Aktywne`, `Do odkrycia`, `Ukończone`; kafelki z nazwą, progres barem, nagrodami, CTA.
- Szczegóły misji: opis, lista kroków, zasady, anti-cheat, nagrody, historia prób.
- „Szybkie działania”: skróty do formularzy pól wymaganych przez misję (np. „Dodaj talię”).
- Banner „Streak”: licznik dni serii + przycisk „Zamroź dzień” (jeśli posiadasz Freeze).
- Skrzynka nagród: pop-up po ukończeniu (confetti 🎉, przycisk „Odbierz”).
- Badgebook: galeria odznak (filtry: sezonowe, zestawowe, precyzja).

**Warstwa danych (high-level)**

- `users(id, plan, created_at, ...)`
- `items(id, user_id, category, subtype, fields_json, created_at, updated_at)`
- `missions(id, code, title, description, type, rules_json, rewards_json, seasonal_window, cooldown_days, repeatable)`
- `user_mission_state(user_id, mission_id, status, progress_json, started_at, completed_at, next_eligible_at)`
- `events(id, user_id, type, payload_json, created_at)`  ← eventy domenowe (np. `ITEM_CREATED`, `FIELD_UPDATED`, `INVITE_ACCEPTED`, `PURCHASE_LOGGED`, `PROFILE_SHARED`)
- `rewards_ledger(id, user_id, source, amount, meta_json, created_at)`
- `badges(user_id, badge_code, granted_at)`
- `referrals(inviter_id, invitee_id, status, milestones_json)`
- `streaks(user_id, current_days, best_days, freezes_owned, freezes_used, last_active_date)`

**Eventy, które karmią misje (min.)**

- `ITEM_CREATED(category, subtype, fields[])`
- `ITEM_UPDATED(category, subtype, fields_changed[])`
- `MISSION_CLAIMED(mission_id)`
- `INVITE_SENT(email/phone)`
- `INVITE_ACCEPTED(user_id_new)`
- `INVITED_USER_PROGRESS(invitee_id, items_count)`
- `PROFILE_SHARED(channel)`
- `PURCHASE_LOGGED(order_id, fit_feedback)` (dla „Dokładność +/-1”)
- `PHOTO_ADDED(item_id)`
- `CIRCLE_PROGRESS(group_id, added_fields_count)`

> Silnik misji to processor zdarzeń: aktualizuje `user_mission_state.progress_json` i sprawdza reguły z `rules_json`.

------

# 2) Mapowanie 30 misji → reguły, postęp, walidacja, nagrody

Dla każdej: **kryterium**, **postęp i walidacja**, **nagrody**, **powtarzalność**, **anty-nadużycia**.

1. **Rozruch 7/7**
   - Kryterium: ≥1 nowy element dziennie przez 7 kolejnych dni.
   - Postęp: `days_streak=0..7`, reset przy braku aktywności.
   - Walidacja: element musi mieć ≥3 kluczowe pola (lub 1 krytyczne dla typu).
   - Nagrody: 100 XP + badge `Rozgrzany`.
   - Powtarzalność: 1× na konto.
   - Anti-cheat: deduplikacja w 24h; brak „dummy” pól.
2. **Sześć Filarów**
   - Kryterium: ≥1 wpis w każdej z 6 kategorii.
   - Postęp: checkboxy per kategoria.
   - Nagrody: 150 XP + odblokowanie motywu.
   - Powtarzalność: co kwartał (cooldown 90 dni).
   - Anti-cheat: komplet pól per kategoria wg schematu.
3. **Szafa 100%**
   - Kryterium: wszystkie typy oznaczone w profilu „Noszę” uzupełnione.
   - Postęp: licznik `done/required`.
   - Nagrody: 200 XP + 7 dni Premium trial.
   - Powtarzalność: 1×/rok, zmiana listy „Noszę” max 1×/mies.
   - Anti-cheat: snapshot listy na start misji.
4. **Złota Talia**
   - Kryterium: talia uzupełniona dla wszystkich „Dół”.
   - Postęp: licznik po typach dołu.
   - Nagrody: 75 XP + ramka `Tailored`.
   - Powtarzalność: co kwartał.
   - Anti-cheat: brak wartości „0/—/n/a”.
5. **Mistrz Klatki**
   - Kryterium: klatka piersiowa w ≥5 różnych typach „Góra”.
   - Postęp: set typów.
   - Nagrody: 75 XP.
   - Powtarzalność: co kwartał.
   - Anti-cheat: wymóg różnych podtypów.
6. **Krok w Kozaki**
   - Kryterium: buty: rozmiar + wkładka; dla kozaków dodatkowo obwód łydki.
   - Postęp: check kompletności pól.
   - Nagrody: 80 XP.
   - Powtarzalność: 1×/sezon (XI–II).
   - Anti-cheat: walidacja zakresów (cm 20–35, łydka 28–50).
7. **Palec w Punkt**
   - Kryterium: rozmiar 3 palców (pierścionki).
   - Postęp: licznik palców.
   - Nagrody: 60 XP + sticker.
   - Powtarzalność: co 6 mies.
   - Anti-cheat: różne palce.
8. **Nadgarstek Pro**
   - Kryterium: obwód nadgarstka + (bransoletka długość *lub* szerokość paska zegarka).
   - Postęp: pola uzupełnione.
   - Nagrody: 70 XP.
   - Powtarzalność: co kwartał.
   - Anti-cheat: jednostki cm/mm.
9. **Bikini Balance**
   - Kryterium: góra i dół bikini + preferencja kroju.
   - Postęp: komplet pary.
   - Nagrody: 80 XP + karta „Lato”.
   - Powtarzalność: 1×/rok (IV–VIII).
   - Anti-cheat: góra i dół parami w 7 dni.
10. **Suit-Up!**

- Kryterium: marynarka (ramiona, klatka, rękaw) + spodnie (talia, biodra, inseam).
- Postęp: 2/2 części.
- Nagrody: 120 XP + odblokowanie „Zestawy”.
- Powtarzalność: 1×/rok.
- Anti-cheat: komplet pól obu części.

1. **Dresowy Duet**

- Kryterium: „Zestaw dres” (góra+dół) w jednym wpisie zestawu.
- Postęp: 1 komplet.
- Nagrody: 60 XP.
- Powtarzalność: 2×/rok.
- Anti-cheat: nie liczyć dwóch osobnych wpisów.

1. **Piżama Prime**

- Kryterium: „Piżama”
- Postęp: kompletność.
- Nagrody: 50 XP.
- Powtarzalność: 2×/rok.
- Anti-cheat: deadline 72h.

1. **Szybki Rozmiar**

- Kryterium: 5 braków uzupełnionych < 5 min (od pierwszego wejścia).
- Postęp: timer + licznik.
- Nagrody: 40 XP.
- Powtarzalność: co 14 dni.
- Anti-cheat: blokada edycji poza wymaganymi polami.

1. **Wiosenne Przeglądy**

- Kryterium: zaktualizuj 10 istniejących wpisów w mar/kwie.
- Postęp: licznik aktualizacji.
- Nagrody: 90 XP + badge sezonowa.
- Powtarzalność: 1×/rok.
- Anti-cheat: realna zmiana wartości.

1. **Jesienny Fit**

- Kryterium: 2 okrycia wierzchnie komplet pól przed 1 XI.
- Postęp: 0/2.
- Nagrody: 90 XP.
- Powtarzalność: 1×/rok.
- Anti-cheat: dwa różne wpisy.

1. **Miseczka Ma Znaczenie**

- Kryterium: obwód pod biustem + miseczka + preferowany krój.
- Postęp: komplet pól.
- Nagrody: 80 XP.
- Powtarzalność: co 6 mies.
- Anti-cheat: walidacja formatów (np. 75C).

1. **Prezentownik PRO**

- Kryterium: min. 5 pozycji na Wishliście powiązanych z rozmiarami.
- Postęp: 0/5.
- Nagrody: 70 XP + karta udostępnialna.
- Powtarzalność: kwartalnie.
- Anti-cheat: unikalne pozycje.

1. **Sekretny Pomocnik**

- Kryterium: udostępnij „Profil rozmiarów” 1 osobie.
- Postęp: link share event + open ping.
- Nagrody: 100 XP.
- Powtarzalność: co 60 dni (nowa osoba).
- Anti-cheat: unikalny odbiorca (hash).

1. **Zaproś i Zmierz**

- Kryterium: zaproś 1 osobę, która doda 10 wpisów w 14 dni.
- Postęp: invite → accepted → milestone.
- Nagrody: 150 XP dla Ciebie, 50 XP dla niego.
- Powtarzalność: do 5×/rok.
- Anti-cheat: device/IP/kyc-lite.

1. **Drużyna Rozmiarów**

- Kryterium: „Krąg” (≤5 osób) doda łącznie 100 pól w 7 dni, każdy min. 10 pól.
- Postęp: progress bar zespołu.
- Nagrody: 200 XP/os + wspólna odznaka.
- Powtarzalność: co kwartał.
- Anti-cheat: weryfikacja udziału jednostek.

1. **Mapa Milimetra**

- Kryterium: 3 wpisy biżuterii z wartościami w mm/cm.
- Postęp: 0/3.
- Nagrody: 60 XP.
- Powtarzalność: co kwartał.
- Anti-cheat: formaty liczbowe.

1. **Kapelusz Miarą**

- Kryterium: obwód głowy + 1 czapka + 1 kapelusz.
- Postęp: 0/2 + metryka.
- Nagrody: 50 XP.
- Powtarzalność: 1×/rok.
- Anti-cheat: różne podtypy.

1. **Rękawiczny Standard**

- Kryterium: obwód dłoni + rozmiar rękawic.
- Postęp: komplet pól.
- Nagrody: 50 XP.
- Powtarzalność: 1×/rok.
- Anti-cheat: zakresy sensowne.

1. **Pasek Idealny**

- Kryterium: rozmiar paska + długość do ulubionej dziurki.
- Postęp: komplet pól.
- Nagrody: 40 XP.
- Powtarzalność: 2×/rok.
- Anti-cheat: cm/cale, nie puste.

1. **Fit Foto** (opcjonalne)

- Kryterium: 3 zdjęcia referencyjne do różnych wpisów.
- Postęp: 0/3.
- Nagrody: 80 XP.
- Powtarzalność: co kwartał.
- Anti-cheat: EXIF/rozmiar/rozpoznanie linijki (opcjonalnie).

1. **Dokładność +/−1**

- Kryterium: 3 porównania zakupów z dopasowaniem („idealnie/za małe/za duże”).
- Postęp: 0/3.
- Nagrody: 70 XP + wskaźnik precyzji %.
- Powtarzalność: co 30 dni.
- Anti-cheat: upload/paragon/ID zamówienia (opcjonalnie).

1. **Streak Ratownik**

- Kryterium: streak 14 dni → zdobywasz 1× Freeze.
- Postęp: licznik streaku.
- Nagrody: `freeze_token=1` (max 2).
- Powtarzalność: 1×/mies.
- Anti-cheat: Freeze działa tylko z wyprzedzeniem.

1. **Rozmiar w Drodze**

- Kryterium: po 20 wpisach uzupełnij 10 pól z podpowiedzi systemu.
- Postęp: 0/10 (tylko pola z rekomendacji).
- Nagrody: 90 XP.
- Powtarzalność: co 60 dni.
- Anti-cheat: tylko „suggested=true”.

1. **Skaner Szafy (manualny)**

- Kryterium: 10 szybkich wpisów (tytuł + 1 kluczowe pole), a potem uzupełnienie braków w 72h.
- Postęp: etap 1/2.
- Nagrody: 100 XP.
- Powtarzalność: co kwartał.
- Anti-cheat: okno 72h.

1. **Ambasador Rozmiarów**

- Kryterium: 3 zaproszonych w 1 tydzień, każdy doda 10 wpisów.
- Postęp: licznik osób i milestone’u.
- Nagrody: 300 XP + 30 dni Premium.
- Powtarzalność: co kwartał.
- Anti-cheat: anty-fraud; unikalne urządzenia.

------

# 3) XP, poziomy i nagrody

**Skala XP (propozycja)**

- Misje małe: 40–80 XP
- Średnie: 90–150 XP
- Duże: 200–300 XP (+ benefit)
- Dzienna aktywność: 5–10 XP (cap 30/dzień)

**Progi poziomów**

- L1: 0 XP
- L2: 150 XP
- L3: 400 XP
- L4: 800 XP
- L5: 1400 XP
- L6: 2200 XP
- L7: 3200 XP
- L8: 4400 XP
- L9: 5800 XP
- L10: 7400 XP

**Nagrody poziomów**

- L2: 1× Freeze
- L3: Motyw kolorystyczny
- L4: 3× boost „+10% XP przez 48h”
- L5: 7 dni Premium
- L7: „Badge Pro”
- L10: 30 dni Premium + profil „Ambasador”

------

# 4) Powiadomienia i rytm komunikacji

**Push/e-mail (optymalnie)**

- Dzienny „nudge” (godzina preferowana w profilu): „Brakuje 2 pól do Sześciu Filarów – dokończ teraz”.
- Sezonowe: start/koniec okien (Wiosenne Przeglądy, Jesienny Fit, Bikini Balance).
- Progi: „+80% postępu w Drużynie Rozmiarów – finisz dziś?”
- Invite: przypomnienie D+3 i D+10 o statusie zaproszonych.
- Streak: rano ping, wieczorem „ostatni dzwonek” (+ możliwość użycia Freeze jednym kliknięciem).

**Anti-spam**

- Max 1 push dziennie + 1 transakcyjny (np. o nagrodzie).
- Quiet hours (22:00–8:00, wg strefy).

------

# 5) Walidacje i anty-nadużycia (core)

- **Zakresy pól**: cm/mm z sensownymi limitami (np. talia 50–150 cm; obwód palca 40–80 mm).
- **Deduplication**: te same wartości dodane w < 5 min nie podbijają postępu.
- **Cooldown**: misje powtarzalne mają zapis `next_eligible_at`.
- **Referrals**: fingerprint urządzenia + e-mail/telefon hash + min. aktywność invitee.
- **Streak**: 1 aktywność/dzień definiuje „dzień zaliczony” (tworzenie/aktualizacja wartości).
- **Freeze**: można aktywować tylko przed końcem dnia lokalnego; nie działa wstecz.

------

# 6) Telemetria i A/B

Mierz:

- CTR push → wejście do misji → ukończenie.
- Które pola rozmiarów są uzupełniane częściej pod wpływem misji.
- Czas do pierwszej nagrody (TTV Reward).
- Social K-factor (średnia liczba skutecznych zaproszeń / użytkownika).
- Retencja D1/D7/D30 w kohortach z misjami vs bez.

A/B przykłady:

- A: opis długi vs B: opis skrócony z ikonami kroków.
- A: XP fixed vs B: XP + booster „×1.2 weekend”.
- A: nagroda Premium od L5 vs B: od L4 (wpływ na konwersję do płatnego).

------

# 7) Specyfikacja reguł (format rules_json – przykład)

```
{
  "code": "SIX_PILLARS",
  "triggers": ["ITEM_CREATED"],
  "requirements": [
    {"category": "Odzież wierzchnia", "min_items": 1, "complete_fields": "schema_default"},
    {"category": "Góra", "min_items": 1, "complete_fields": "schema_default"},
    {"category": "Dół", "min_items": 1, "complete_fields": "schema_default"},
    {"category": "Bielizna", "min_items": 1, "complete_fields": "schema_default"},
    {"category": "Biżuteria", "min_items": 1, "complete_fields": "schema_default"},
    {"category": "Akcesoria", "min_items": 1, "complete_fields": "schema_default"}
  ],
  "cooldown_days": 90,
  "repeatable": true,
  "rewards": {"xp":150, "badges":["THEME_UNLOCK"]}
}
```

> `schema_default` odwołuje do matrycy pól obowiązkowych per (kategoria, podkategoria).

------

# 8) Kryteria akceptacji (QA)

- Każda misja ma stan: `lock` (ukryta) → `available` → `in_progress` → `claimable` → `completed` → (opcjonalnie) `cooldown`.
- Zdarzenie `ITEM_CREATED`/`ITEM_UPDATED` aktualizuje postęp w ≤1 s.
- Przy „claim” zapis w `rewards_ledger` i wzrost XP widoczny na profilu w czasie rzeczywistym.
- Misje sezonowe pojawiają się tylko w oknie czasowym i znikają po nim (zachowują stan w historii).
- Streak spada tylko jeśli brak aktywności i freeze nieaktywny.
- Zaproszenia z tego samego urządzenia do samego siebie nie zaliczają misji (test z 3 scenariuszami fraudu).
- Wskaźnik „precyzja profilu” rośnie po „Dokładność +/-1” tylko gdy feedback został udzielony dla realnego zakupu (QA: mutacja wskaźnika po 3 wpisach).