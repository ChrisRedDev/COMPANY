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
