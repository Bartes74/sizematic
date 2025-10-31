# Playwright E2E Test Plan

## Cele
- Zweryfikować kluczowe ścieżki użytkownika w buildzie produkcyjnym.
- Przygotować pokrycie testowe możliwe do uruchamiania lokalnie oraz z pomocą Playwright MCP (nagrania, screenshoty, DOM snapshots).

## Iteracja 1 – Priorytety

| Obszar | Scenariusze | Status |
| --- | --- | --- |
| Autoryzacja | Logowanie poprawne / błędne, rejestracja demo | TODO |
| Landing page | Render hero, otwarcie modalu logowania | ✅ (landing.spec.ts) |
| Dashboard | Render nagłówka, sekcji „Zapisz swoje rozmiary”, „Twoje misje”, „Krąg zaufanych” | TODO |
| Quick Sizes | Dodanie rozmiaru z modalu, aktualizacja skrótów, weryfikacja kafelków | TODO |
| Trusted Circle | Widok listy członków + fallback gdy brak danych | TODO |
| Missions | Fallback „Brak misji” oraz render przykładowej misji (mock danych) | TODO |
| Strona „Zobacz wszystkie rozmiary” | Nawigacja z dashboardu, render kart, modal edycji | TODO |

## Założenia
- Używamy testowego użytkownika seed (do ustalenia w kolejnych krokach).
- Testy uruchamiamy w Chrome (headless). Inne przeglądarki dodamy po stabilizacji.
- MCP wykorzystamy do debuggingu (komendy `get-screenshot`, `get-context`, nagrania).

## Kolejne iteracje
- Udostępnianie rozmiarów w Kręgu Zaufanych.
- Event calendar, wishlist, aktywność.
- Przełącznik języka (PL/EN).
