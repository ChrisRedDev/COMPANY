# Architektura Evolution Growth OS

## Faza 1

Next.js → Supabase Auth → członkostwo workspace → Postgres/RLS → repozytorium CRM → Zustand jako pamięciowy cache → istniejące moduły CRM.

`components/growth/` odpowiada za logowanie, przełączanie przestrzeni i stan synchronizacji. `lib/growth/` definiuje kontrakty i walidację. `lib/supabase/` tworzy klientów. `app/api/workspaces/` weryfikuje sesję przez Auth getUser i wykonuje zapytania z JWT użytkownika, nigdy kluczem service_role. `supabase/migrations/` stanowi wersjonowany kontrakt bazy.

Tryb serwera wybiera `NEXT_PUBLIC_CRM_MODE=cloud`. W chmurze brak env powoduje czytelny ekran konfiguracji, bez fallbacku do lokalnych danych. Supabase SDK zarządza wyłącznie sesją Auth; dane CRM nie trafiają do localStorage. Tryb lokalny pozostaje zgodny z dotychczasowym formatem kopii.

Każda przestrzeń ma osobne rekordy i revision. Atomowa funkcja zapisuje zestaw CRM, ustawienia i audit log w transakcji. Optymistyczna kontrola revision odrzuca nadpisanie zmian innego urządzenia. Klient szereguje zapisy i zatrzymuje edycję przy błędzie. Przełączenie przestrzeni czyści cache; nie przenosi danych poprzedniej firmy. Początkowy zapis do bazy jest pusty; dane lokalne importuje się świadomie z kopii JSON.

Role: viewer odczyt; marketer operacyjny zapis CRM; admin operacyjny zapis i odczyt audytu; owner zarządzanie przestrzenią i rolami. Zmiany ról wymagają właściciela; nie można odebrać roli ostatniemu ownerowi. RLS sprawdza członkostwo po auth.uid(), nie po zaufanym workspace_id z formularza.

## Granice fazy

Globalna integracja Resend działa tylko w trybie lokalnym. W chmurze wyłączamy jej wysyłkę do czasu zbudowania osobnych sekretów i zatwierdzeń per workspace. Przeglądanie szkiców pozostaje dostępne. Cloud nie jest jeszcze kompletnym SaaS: brak billing, zaproszeń e-mail, automatyzacji i live Ads.

## Kolejne warstwy

Adapters: read-only pobrania do wspólnego modelu, jawne stany needs_setup/error/connected, sync cursors i idempotencja. Tracking porównuje konwersje dostawców z leadami w tym samym okresie. Raporty liczą KPI po stronie domain/services; AI interpretuje zacytowane fakty.

Context Router dobiera dokumenty i metryki według zadania/workspace z budżetem tokenów. Model Router mapuje kategorię zadania na konfigurację providera. Agents mają purpose, permissions, tools i context_scope. PREPARE tworzy propozycję; APPROVE utrwala decyzję uprawnionego użytkownika; EXECUTE sprawdza jej aktualność i adapter. Brak zgody wyklucza zapis do zewnętrznej platformy.

Sekrety OAuth/integracji wymagają serwerowego magazynu szyfrowanego, rotacji i weryfikacji webhooków. `.mcp.json` jest narzędziem deweloperskim, nie kanałem danych aplikacji.

## Lead Hub · 0.4.0

Dodano moduł pozyskiwania i obsługi leadów obok CRM, dostępny w SQLite i Supabase. Zapisuje kontakt, status, źródła, kampanie, UTM, zdarzenia i touchpoints; chronologicznie wyznacza first/last touch. Deduplikacja wykorzystuje e-mail lub telefon, a konflikty tożsamości i wersji chronią przed przypadkowym nadpisaniem. Oferty, rezerwacje, prace, konwersje i wpłaty stanowią osobny fundament sprzedaży. Demo jest jawnie oznaczone i idempotentne. Lista, karta historii, filtry, eksport JSON i mobilny interfejs zachowują dotychczasowy CRM.

SQLite inicjalizuje nowe tabele przy pierwszym użyciu modułu. Supabase wymaga migracji 003 po 001 i 002; stosuje członkostwo przestrzeni i kontrolę ról. Zapis leada i jego historii jest transakcyjny, z osobną revision, bez zmiany snapshotu CRM. Nie ma automatycznej konwersji do istniejących firm/zleceń, live Ads/telefonii ani połączenia kosztów z atrybucją; te integracje pozostają kolejnym krokiem. Szczegóły: [LEAD-HUB.md](LEAD-HUB.md).

## Statystyki Google · 0.5.0

Dodano lokalne konektory Google Analytics 4 i Search Console, wybór usługi osobno dla przestrzeni, uwierzytelnienie kontem usługi lub własnym OAuth, ręczny odczyt i zapis raportów w SQLite. Pulpit pokazuje osobne metryki, wykresy, kanały i zapytania. Nie sumujemy ich z wynikami CSV lub wpłatami CRM. Błędy zachowują poprzedni zapis i datę sukcesu, a wyłączenie konektora ukrywa jego raport. Zmiana usługi czyści stary raport tej przestrzeni. HTTP ma timeout, limit odpowiedzi i jedno ponowienie błędów przejściowych. Ten etap wprowadził raporty GA4/GSC; rozwinięcie OAuth i Ads opisuje wersja 0.7.0 poniżej. Konfiguracja i granice w [GOOGLE-INTEGRATIONS.md](GOOGLE-INTEGRATIONS.md).

## Google OAuth i Ads · 0.7.0

Lokalne SQLite: logowanie przez Google, osobny szyfrowany token dla firmy, wybór GA4/GSC/Ads z listy i konta pod MCC. Ads używa oficjalnego REST v25 i pokazuje koszt, konwersje, wartość konwersji, CTR, CPC, CPA i ROAS, wykresy i kampanie. Kwoty mają walutę konta; raport obejmuje 30 zakończonych dni w jego strefie czasowej. Nie łączymy go automatycznie z kosztami CSV, atrybucją Lead Hub lub wpłatami CRM. Brak zmian reklam, harmonogramu i tych konektorów w Supabase.

OAuth: jednorazowy state, PKCE S256, cookie HttpOnly/SameSite Lax przypisane do logowania, limit 10 minut i powrót wyłącznie na lokalny host. Callback GET ma wąski wyjątek cross-site; pozostałe API zachowuje ochronę origin. Sekrety i tokeny nie trafiają do odpowiedzi UI. Skarbiec AES-256-GCM leży obok bazy w katalogu `.google-oauth`, ma oddzielny klucz i wiąże rekord z firmą oraz klientem OAuth. Eksport SQLite pomija ten katalog. Zmiana konta czyści wybór usług i stare raporty; równoległy odczyt nie może zapisać raportu wcześniejszego połączenia. Szczegółowa [instrukcja Google](GOOGLE-INTEGRATIONS.md).
