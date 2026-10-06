# Evolution Growth OS 0.8 — audyt i dopracowanie

Cel: żeby narzędzie dawało firmie więcej wartości każdego dnia — agent AI, który naprawdę obsługuje CRM, czytelne statystyki, raporty dla zarządu i automatyzacje, które działają bez pamiętania o nich.

## Audyt 0.7 — co znaleźliśmy

| #   | Obszar        | Problem                                                                                                                                                                    | Waga      |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Agent AI      | Działał **tylko w trybie SQLite**. W trybie przeglądarki i Supabase sekcja AI pokazywała „niedostępne”, a pytanie z pulpitu przenosiło do agenta follow-up.                | Krytyczna |
| 2   | Agent AI      | Agent umiał zaproponować tylko zadanie lub notatkę — nie mógł dodać firmy, kontaktu, szansy, zmienić etapu ani przygotować maila. Nie było trybu wykonywania bez klikania. | Wysoka    |
| 3   | Dostawcy AI   | Brak bezpośredniego OpenAI API i lokalnego modelu (Ollama / LM Studio). Błędy dostawcy zwracały ogólny komunikat bez przyczyny (401/402/404/429).                          | Wysoka    |
| 4   | Dostawcy AI   | Odpowiedź modelu musiała być „czystym” JSON — tekst przed blokiem kodu kończył się błędem całej analizy, a jedna błędna akcja odrzucała wszystkie.                         | Średnia   |
| 5   | Pulpit        | Brak porównania okresów, trendów i wskaźników aktywności; KPI powielone między centrum dowodzenia i sekcją sprzedaży.                                                      | Średnia   |
| 6   | Raporty       | Brak generatora raportów i eksportu dla zarządu (PDF/CSV).                                                                                                                 | Wysoka    |
| 7   | Automatyzacja | Brak harmonogramu — każdy raport, przegląd i follow-up trzeba było uruchamiać ręcznie.                                                                                     | Wysoka    |
| 8   | Supabase      | `save_workspace` przepuszczał tylko wybrane pola ustawień, więc nowe dane przestrzeni (np. automatyzacje) nie mogły być zapisane w chmurze.                                | Średnia   |

Zweryfikowane jako poprawne: flagi Codex CLI (`codex-cli 0.160`) używane do analizy przez subskrypcję ChatGPT, izolacja przestrzeni, RLS i kontrola wersji w Supabase oraz SQLite.

## Co zmieniliśmy w 0.8

1. **Uniwersalny Agent AI** (`lib/ai/agent.ts`, `stores/agent-store.ts`, `app/api/agent/route.ts`, `components/copilot/copilot.tsx`)
   - działa w trybie przeglądarki, SQLite i Supabase; pytanie z pulpitu zawsze trafia do agenta,
   - 9 akcji: firmy, kontakty, szanse (nowe i zmiany etapu), zadania (nowe i zamknięcie), szkice maili, raporty, automatyzacje; nową firmę można wskazać nazwą w kolejnych akcjach,
   - **Autopilot** — agent sam wykonuje swoje propozycje; bez niego każda akcja ma **Wykonaj / Odrzuć** i **Wykonaj wszystkie**,
   - silniki: offline, OpenRouter, OpenAI API, lokalny model zgodny z OpenAI, subskrypcja ChatGPT przez Codex CLI, Claude Code CLI; lista modeli z API,
   - tolerancyjne parsowanie odpowiedzi (JSON w bloku kodu lub z tekstem), walidacja każdej akcji osobno, czytelne błędy HTTP i automatyczny fallback do agenta offline,
   - klucze serwera tylko dla `localhost` lub zalogowanych użytkowników Supabase; CLI tylko na `localhost`; ochrona przed żądaniami cross-site.
2. **Pulpit ze statystykami** (`components/insights`) — 6 KPI z porównaniem 30/30 dni i trendem 8 tygodni, lejek, status planu zadań, ranking klientów, mapa aktywności 12 tygodni, najbliższe automatyzacje i ostatnie raporty.
3. **Raporty** (`lib/reports/generate.ts`, `components/reports`) — 4 rodzaje × 6 okresów, porównanie z poprzednim okresem, wykresy, tabele, rekomendacje, podsumowanie AI, eksport PDF/Markdown/CSV, historia 24 raportów.
4. **Harmonogram** (`lib/automation/model.ts`, `stores/scheduler.ts`, `components/automation`) — codziennie / w dni robocze / co tydzień / co miesiąc w strefie Europe/Warsaw (z obsługą zmiany czasu), szablony, uruchomienie ręczne, historia, nadrabianie pominiętych terminów i blokada wielu kart.
5. **Zapis wszędzie** — automatyzacje i raporty są częścią przestrzeni (`Preferences.automation`), walidowane w `validateSnapshot`, zapisywane w localStorage, SQLite i Supabase (migracja `202610060001_automation_reports.sql`).

## Weryfikacja

- `npm test` — 66 testów, w tym nowe `tests/automation.test.cjs` (strefa czasowa i DST, raporty i eksporty, parsowanie odpowiedzi modelu, intencje agenta offline, zapis przestrzeni).
- Migracje i `tests/integration/*.sql` (z nowym `automation.sql`) na PostgreSQL 16.
- Przepływ w przeglądarce: agent z modelem zgodnym z OpenAI (serwer testowy) w autopilocie dodał firmę, szansę wskazaną nazwą firmy i zmienił etap; agent offline dodał zadanie i automatyzację; harmonogram uruchomił briefing; raport zapisany w SQLite przetrwał przeładowanie; eksport PDF.
- `next build`, `tsc --noEmit`, `eslint`.

## Ograniczenia i kolejne kroki

- Harmonogram działa, gdy aplikacja jest otwarta. Kolejny krok: wykonywanie po stronie serwera (`pg_cron` + Edge Function w Supabase, proces w tle dla SQLite) i wysyłka raportu e-mailem przez Resend.
- Agent nie wysyła maili ani nie usuwa danych — tylko szkice i zmiany, które można cofnąć ręcznie. Dziennik zmian z cofaniem jednym kliknięciem to dobry kolejny krok.
