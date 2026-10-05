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
