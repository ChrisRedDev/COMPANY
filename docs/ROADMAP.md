# Evolution Growth OS — roadmapa

Produkt AI Evolution Polska dla lokalnych firm usługowych. Polski interfejs, PLN i Europe/Warsaw. System ma odpowiadać: co się wydarzyło, dlaczego i co zrobić dalej.

## Audyt repozytorium (5 października 2026)

Działają: firmy (NIP, CSV), kontakty, tablica szans, zadania, poczta Resend, szkice follow-up, JSON backup i onboarding. Zachowujemy te funkcje i istniejące testy. `components/crm/`, `lib/crm/` i `stores/crm-store.ts` stanowią aktywny produkt. `components/companies/`, dawny store firm i biblioteki animacji są legacy; nie usuwamy ich w tej fazie.

Dane biznesowe, podpis i ustawienia zapisują się wyłącznie w localStorage. Brakuje kont, ról, bazy, workspace isolation i audytu. Token poczty pozostaje w pamięci sesji. `.mcp.json` wskazuje Supabase, lecz nie stanowi konfiguracji aplikacji ani dowodu dostępności bazy. W środowisku brak zmiennych Supabase i narzędzi tego MCP. `CLAUDE.md` odsyła do nieistniejącego `CONVENTIONS.md`; Next.js instrukcje są dostępne i obowiązują.

## Fazy i kryteria odbioru

1. **Fundament**: Supabase Auth, przestrzenie, owner/admin/marketer/viewer, RLS, atomowy zapis CRM z kontrolą wersji, audyt, migracja JSON. Tryb lokalny zachowany. Brak konfiguracji nie może udawać połączenia z chmurą.
2. **Leady**: Lead Hub, statusy, atrybucja, lead_events i mobilna oś czasu. Zachować CRM.
3. **Marketing**: KPI z danych, zakresy i poprzedni okres, landing pages, rozbieżności trackingu. Jawnie oznaczone dane testowe/import.
4. **Integracje**: wspólny kontrakt adapterów, Google/Microsoft Ads, GA4/GTM, WordPress, GBP, PostHog. Sekrety na serwerze. Brak pozorowanego OAuth.
5. **Company Brain**: dokumenty Markdown, import/eksport, selektywny Context Router, cache scrapingu oparty o hash.
6. **AI Brain**: router zadań i modeli, specjaliści z uprawnieniami, koszt i tokeny. Żaden agent nie ma dowolnego SQL/requestów.
7. **Rekomendacje**: uniwersalna kolejka, zatwierdzenie/odrzucenie, ponowne sprawdzenie uprawnień przed wykonaniem.
8. **Raporty i automatyzacje**: daily/weekly/monthly z faktów, dry-run reguł, harmonogram, ograniczenia wykonania.

Po każdej fazie: lint, TypeScript, unit/integration, Playwright, build, dokumentacja i mały logiczny commit. Pełne live API po MVP. Prawdziwy Supabase musi mieć osobną walidację wdrożeniową; test provider nie potwierdza dostępu do produkcji.

## Aktualizacja: lokalna edycja na życzenie użytkownika

Dodano niezależną opcję SQLite z przestrzeniami, Company Brain Markdown i eksportem do Obsidiana, importem kampanii i dashboardem, adapterami odczytu WordPress/PostHog oraz AI Brain (OpenRouter i lokalne CLI). Zadania/notatki agenta wymagają zatwierdzenia. To lokalna implementacja wybranych funkcji, nie zakończenie wszystkich faz ani automatyczna migracja do Supabase. Szczegóły w LOCAL-EDITION.md.

## Lead Hub · 0.4.0

Dodano moduł pozyskiwania i obsługi leadów obok CRM, dostępny w SQLite i Supabase. Zapisuje kontakt, status, źródła, kampanie, UTM, zdarzenia i touchpoints; chronologicznie wyznacza first/last touch. Deduplikacja wykorzystuje e-mail lub telefon, a konflikty tożsamości i wersji chronią przed przypadkowym nadpisaniem. Oferty, rezerwacje, prace, konwersje i wpłaty stanowią osobny fundament sprzedaży. Demo jest jawnie oznaczone i idempotentne. Lista, karta historii, filtry, eksport JSON i mobilny interfejs zachowują dotychczasowy CRM.

SQLite inicjalizuje nowe tabele przy pierwszym użyciu modułu. Supabase wymaga migracji 003 po 001 i 002; stosuje członkostwo przestrzeni i kontrolę ról. Zapis leada i jego historii jest transakcyjny, z osobną revision, bez zmiany snapshotu CRM. Nie ma automatycznej konwersji do istniejących firm/zleceń, live Ads/telefonii ani połączenia kosztów z atrybucją; te integracje pozostają kolejnym krokiem. Szczegóły: [LEAD-HUB.md](LEAD-HUB.md).

## Statystyki Google · 0.5.0

Dodano lokalne konektory Google Analytics 4 i Search Console, wybór usługi osobno dla przestrzeni, uwierzytelnienie kontem usługi lub własnym OAuth, ręczny odczyt i zapis raportów w SQLite. Pulpit pokazuje osobne metryki, wykresy, kanały i zapytania. Nie sumujemy ich z wynikami CSV lub wpłatami CRM. Błędy zachowują poprzedni zapis i datę sukcesu, a wyłączenie konektora ukrywa jego raport. Zmiana usługi czyści stary raport tej przestrzeni. HTTP ma timeout, limit odpowiedzi i jedno ponowienie błędów przejściowych. Ten etap wprowadził raporty GA4/GSC; rozwinięcie OAuth i Ads opisuje wersja 0.7.0 poniżej. Konfiguracja i granice w [GOOGLE-INTEGRATIONS.md](GOOGLE-INTEGRATIONS.md).

## Google OAuth i Ads · 0.7.0

Lokalne SQLite: logowanie przez Google, osobny szyfrowany token dla firmy, wybór GA4/GSC/Ads z listy i konta pod MCC. Ads używa oficjalnego REST v25 i pokazuje koszt, konwersje, wartość konwersji, CTR, CPC, CPA i ROAS, wykresy i kampanie. Kwoty mają walutę konta; raport obejmuje 30 zakończonych dni w jego strefie czasowej. Nie łączymy go automatycznie z kosztami CSV, atrybucją Lead Hub lub wpłatami CRM. Brak zmian reklam, harmonogramu i tych konektorów w Supabase.

OAuth: jednorazowy state, PKCE S256, cookie HttpOnly/SameSite Lax przypisane do logowania, limit 10 minut i powrót wyłącznie na lokalny host. Callback GET ma wąski wyjątek cross-site; pozostałe API zachowuje ochronę origin. Sekrety i tokeny nie trafiają do odpowiedzi UI. Skarbiec AES-256-GCM leży obok bazy w katalogu `.google-oauth`, ma oddzielny klucz i wiąże rekord z firmą oraz klientem OAuth. Eksport SQLite pomija ten katalog. Zmiana konta czyści wybór usług i stare raporty; równoległy odczyt nie może zapisać raportu wcześniejszego połączenia. Szczegółowa [instrukcja Google](GOOGLE-INTEGRATIONS.md).
