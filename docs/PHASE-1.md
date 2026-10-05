# Faza 1 — fundament Evolution Growth OS

## DONE

Audyt i dokumenty przed implementacją. Supabase Auth (rejestracja, potwierdzanie e-mail, login/logout), przestrzenie, role, RLS, wersjonowany zapis CRM, kontrola konfliktów i audyt. Zachowany lokalny CRM i testy.

## CHANGED

Nowe moduły growth/supabase i migracja SQL. Zustand w chmurze jest cache w pamięci. Przełączenie czyści cache, nowa przestrzeń jest pusta. JSON zapewnia migrację lokalnych danych. Owner dodaje istniejących użytkowników UUID; brak zaproszeń mailowych. Globalny Resend jest blokowany w chmurze. Błędy zapisu oferują kopię zmian i ponowne wczytanie.

## TESTED

Lint, TypeScript i production build przeszły. 16/16 testów unit/API, 6/6 istniejących Playwright i 4/4 nowych Playwright chmury. Skrypt test:db wykonał migrację i asercje izolacji, viewer/marketer/admin/owner, eskalacji ról, ostatniego ownera, konfliktu, rollback i audytu. Testy DB używają Postgres z odpowiednikiem auth.uid(); UI chmury używa jawnego test provider. Żaden z nich nie potwierdza dostępu do rzeczywistego projektu Supabase.

## NEXT

Konfiguracja projektu i live smoke test, następnie Faza 2: Lead Hub, atrybucja, events i mobilna oś czasu. Model następnych modułów opisany w DATA-MODEL; nie wdrożono jeszcze marketingowych mockupów ani pełnego AI.

## RISKS

Brak env projektu i uprawnionego połączenia do Supabase w środowisku. SQL nie został wdrożony do projektu z .mcp.json. Atomowy snapshot CRM ogranicza skalę; konflikt dwóch zapisów wymaga ponownego wczytania. Brak realtime, billing, password recovery i e-mail invitations. RLS nie zastępuje monitorowania, limitowania ruchu i zabezpieczeń wdrożenia. Wysyłka workspace oraz live Ads pozostają kolejnymi fazami.
