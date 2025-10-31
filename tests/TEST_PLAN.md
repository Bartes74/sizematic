# Playwright E2E Test Plan

## Cele
- Zweryfikować kluczowe ścieżki użytkownika w buildzie produkcyjnym.
- Przygotować pokrycie testowe możliwe do uruchamiania lokalnie oraz z pomocą Playwright MCP (nagrania, screenshoty, DOM snapshots).

## Iteracja 1 – Priorytety

| Obszar | Scenariusze | Status |
| --- | --- | --- |
| Autoryzacja | Logowanie poprawne / błędne (auth.spec.ts), rejestracja demo | 🟡 login ✅ / rejestracja TODO |
| Landing page | Render hero, otwarcie modalu logowania | ✅ (landing.spec.ts) |
| Dashboard | Render nagłówka, sekcji „Zapisz swoje rozmiary”, „Krąg zaufanych” | ✅ (dashboard.spec.ts) |
| Quick Sizes | Dodanie rozmiaru z modalu, aktualizacja skrótów, weryfikacja kafelków | ✅ (dashboard.spec.ts) |
| Trusted Circle | Widok listy członków + fallback gdy brak danych | ✅ (dashboard.spec.ts) |
| Strona „Zobacz wszystkie rozmiary” | Nawigacja z dashboardu, render kart, modal edycji | ✅ (sizes-directory.spec.ts) |

## Założenia
- Używamy testowego użytkownika seed (do ustalenia w kolejnych krokach).
- `PLAYWRIGHT_TEST_EMAIL` oraz `PLAYWRIGHT_TEST_PASSWORD` muszą wskazywać tego użytkownika.
- Testy uruchamiamy w Chrome (headless). Inne przeglądarki dodamy po stabilizacji.
- MCP wykorzystamy do debuggingu (komendy `get-screenshot`, `get-context`, nagrania).

## Kolejne iteracje
- Udostępnianie rozmiarów w Kręgu Zaufanych.
- Event calendar, wishlist, aktywność.
- Przełącznik języka (PL/EN).
