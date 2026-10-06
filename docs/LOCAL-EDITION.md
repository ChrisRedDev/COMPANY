# Lokalna edycja Growth OS

SQLite dodaje samodzielną opcję lokalną do trybów localStorage i Supabase. Start: Node.js 24, npm ci, npm run dev:localdb; loopback 127.0.0.1. Plik danych jest wyłączony z Git.

Tabele: workspaces (wersjonowany snapshot CRM), documents (workspace, Markdown, revision), campaign_days (workspace/date/source/campaign), connections, provider_data, audit_log, agent_messages, agent_actions. Każda domena odwołuje się do workspace. Klucze są w env, pamięci sesji lub osobnym szyfrowanym skarbcu OAuth, nigdy w bazie. Snapshot CRM jest zachowany dla kompatybilności JSON; osobne moduły mają własne tabele.

Warstwy: lib/local (DB/guard), knowledge (walidacja/repo/vault), integrations (adapters/import/KPI), ai (providers/context/proposals/approvals), components/local (UI), /api/local (odczyt i wąskie operacje). Zapis używa parametrów SQL i transakcji BEGIN IMMEDIATE. Agent może wykonać jedynie create_task/create_note po zgodzie; serwer weryfikuje workspace i stan propozycji. Zmiana CRM od czasu analizy blokuje akceptację. Inne propozycje tej samej analizy mogą zostać zatwierdzone kolejno.

Node:sqlite jest wbudowane w Node 24; bez dodatkowego serwera. Baza używa WAL i spójnej kopii VACUUM INTO. Ścieżka bazy jest konfiguracją właściciela instalacji, nie parametrem API. Middleware lokalne odrzuca obce hosty/origin; skrypt uruchamia loopback. To tryb jednej instalacji, bez kont i publicznego hostowania.

AI: OpenRouter REST + models; sesyjny klucz TTL 30 min. CLI dostawcy uruchamiane przez execFile bez shell w tymczasowym folderze; brak system tools/MCP. Narzędzia biznesowe to wyłącznie walidowane propozycje wykonane przez aplikację. Brak testów realnych kont lub płatnych wywołań; kompatybilność konkretnych wersji CLI wymaga smoke testu użytkownika.

Kolejne kroki: atrybucja Ads/Lead Hub, rozbudowane zdarzenia/tracking health, synchronizacja vault, migracje modułów do Supabase z RLS. Tryb cloud obejmuje CRM oraz Lead Hub.

## Generator Company Brain

Szablon referencyjny: `docs/templates/COMPANY_BRAIN_TEMPLATE.md`. Stała struktura 34 sekcji jest w `lib/knowledge/generation-model.ts`; treść dokumentu użytkownika nie dostaje uprawnień systemowych. Model odpowiada JSON-em, którego pola, długości, numery sekcji i identyfikatory źródeł są walidowane. Nieznane sekcje są MISSING. Sekcje uprawnień, źródeł i historii pochodzą z aplikacji. Zalecenia oraz brakujące dane wymagają weryfikacji właściciela.

`research.ts` odczytuje do 5 stron tej samej domeny, tylko HTTPS/HTML, bez parametrów, credentials, przekierowań i wykonywania JS. DNS musi wskazywać adresy publiczne; wybrany adres jest przypięty do lookup TLS, z obsługą obu kontraktów DNS (pojedynczy/all). Zachowana jest standardowa weryfikacja certyfikatu. Limit 2 MB / 20 sekund na stronę, do 14k znaków tekstu na źródło. Proxy HTTPS jest rozpoznawane i blokuje bezpośredni odczyt zamiast omijania sieciowej polityki. Nie jest to pełny crawler ani wyszukiwarka konkurencji.

Tabela `brain_generations`: workspace, JSON szkicu/źródeł/zużycia, stan draft/saved i data. Szkic zostaje zapisany po poprawnej odpowiedzi AI. Nie jest częścią kontekstu analitycznego przed zatwierdzeniem. Endpoint save-generation pobiera szkic po ID i workspace; nie przyjmuje dowolnego zestawu dokumentów z klienta. Cztery INSERT-y i zmiana statusu odbywają się w jednej transakcji. Unikalność tytułów w folderze powoduje rollback całego zapisu, bez nadpisania. Kolejne zatwierdzenie tego samego ID jest odrzucane. Pełna kopia SQLite obejmuje również szkice.

Główny COMPANY_BRAIN ma priorytet w kontekście agenta (do 12k znaków). Do pięciu notatek łącznie; pozostałe do 2,5k znaków każda, dopasowane do pytania. To ograniczony kontekst, nie pełny system RAG. Oferta/Marka/Marketing są kopiami sekcji z chwili generowania, z odnośnikiem do głównego dokumentu; nie synchronizują edycji automatycznie.

CLI Codex wymaga flag --ignore-user-config, --ignore-rules, --ephemeral, --disable shell_tool i unified_exec, pustego mcp_servers, wyłączonego web_search oraz --output-last-message. Ich dostępność została sprawdzona przez lokalne --help/features; nie wykonano płatnego logowania/analizy. Claude wymaga -p, --tools "", --strict-mcp-config, --mcp-config i --output-format json; binarka nie była dostępna w tym środowisku. Użytkownik weryfikuje aktualne CLI własnego konta przed użyciem.

## Lead Hub · 0.4.0

Dodano moduł pozyskiwania i obsługi leadów obok CRM, dostępny w SQLite i Supabase. Zapisuje kontakt, status, źródła, kampanie, UTM, zdarzenia i touchpoints; chronologicznie wyznacza first/last touch. Deduplikacja wykorzystuje e-mail lub telefon, a konflikty tożsamości i wersji chronią przed przypadkowym nadpisaniem. Oferty, rezerwacje, prace, konwersje i wpłaty stanowią osobny fundament sprzedaży. Demo jest jawnie oznaczone i idempotentne. Lista, karta historii, filtry, eksport JSON i mobilny interfejs zachowują dotychczasowy CRM.

SQLite inicjalizuje nowe tabele przy pierwszym użyciu modułu. Supabase wymaga migracji 003 po 001 i 002; stosuje członkostwo przestrzeni i kontrolę ról. Zapis leada i jego historii jest transakcyjny, z osobną revision, bez zmiany snapshotu CRM. Nie ma automatycznej konwersji do istniejących firm/zleceń, live Ads/telefonii ani połączenia kosztów z atrybucją; te integracje pozostają kolejnym krokiem. Szczegóły: [LEAD-HUB.md](LEAD-HUB.md).

## Statystyki Google · 0.5.0

Dodano lokalne konektory Google Analytics 4 i Search Console, wybór usługi osobno dla przestrzeni, uwierzytelnienie kontem usługi lub własnym OAuth, ręczny odczyt i zapis raportów w SQLite. Pulpit pokazuje osobne metryki, wykresy, kanały i zapytania. Nie sumujemy ich z wynikami CSV lub wpłatami CRM. Błędy zachowują poprzedni zapis i datę sukcesu, a wyłączenie konektora ukrywa jego raport. Zmiana usługi czyści stary raport tej przestrzeni. HTTP ma timeout, limit odpowiedzi i jedno ponowienie błędów przejściowych. Ten etap wprowadził GA4/GSC; OAuth i Ads opisuje aktualne wydanie poniżej. Konfiguracja i granice w [GOOGLE-INTEGRATIONS.md](GOOGLE-INTEGRATIONS.md).

## Google OAuth i Ads · 0.7.0

Logowanie Google i wybór usług działają osobno dla firmy. Ads odczytuje oficjalne API v25 z tokenem deweloperskim; obsługuje numery kont pod MCC. Raporty i wybory są w SQLite, tokeny odświeżania AES-256-GCM w katalogu `<ścieżka-bazy>.google-oauth/` obok bazy. Klucz i pliki są wyłączone z Git oraz eksportu SQLite. Przy odtworzeniu kopii bazy zaloguj ponownie. Lokalna ochrona origin pozostaje aktywna; tylko dokładny callback OAuth GET dopuszcza cross-site i wymaga state/cookie/PKCE. Instrukcja: [GOOGLE-INTEGRATIONS.md](GOOGLE-INTEGRATIONS.md).
