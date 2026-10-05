# Evolution Growth OS — Twoja firma, wiedza i działanie

**Produkt AI Evolution Polska. Lokalny CRM, Company Brain i agent AI dla firm w Polsce.**

Wiedza o firmie często jest rozproszona: oferta na stronie, ustalenia w wiadomościach, kontakty w arkuszu, pomysły w notatkach. Evolution Growth OS zbiera je w jednym jasnym obszarze pracy. Pomaga zobaczyć stan sprzedaży, zachować kontekst marki i przygotować konkretny kolejny krok.

## Firma opisana raz, kontekst na kolejne zadania

Podajesz adres strony, wybierasz model i dostajesz szkic Company Brain. Główny dokument obejmuje 34 sekcje: firmę, ofertę, klientów, markę, marketing, źródła i brakujące informacje. Powiązane notatki porządkują ofertę, markę i pomysły marketingowe. Sprawdzasz szkic, uzupełniasz wiedzę właściciela i zapisujesz. Każda kolejna rozmowa z agentem może korzystać z tego kontekstu, w granicach limitu danych opisanych w README.

Wiedza pozostaje przenośna: Markdown, foldery i wikilinki. Eksport ZIP otworzysz jako skarbiec Obsidiana. Nie ma automatycznej synchronizacji plików między aplikacjami.

## Od kontaktu do współpracy

Dodajesz firmę, kontakt, szansę sprzedaży i zadanie. Wartość jest w PLN, NIP przechodzi walidację, a terminy są liczone według Europe/Warsaw. Pulpit sprzedaży oraz marketingu pokazuje wartości wynikające z danych, które zapiszesz lub zaimportujesz.

## Model wybierasz sam

OpenRouter API udostępnia wybór modeli. Zalogowane lokalne CLI Codex i Claude Code pozwalają korzystać z dostępów własnego konta. Agent analizuje dane wybranej firmy, odpowiada i proponuje zadania lub notatki. Ty sprawdzasz i zatwierdzasz zmianę. Koszty oraz limity zależą od dostawcy.

## Źródła, które mają konkretną rolę

WordPress importuje publiczne strony do wiedzy firmy. PostHog odczytuje agregaty zdarzeń. CSV kampanii zasila metryki marketingowe. Resend wysyła zatwierdzone szkice; program pocztowy otwiera wiadomość przez mailto. Statusy pokazują konfigurację i wynik odczytu. Żadne z tych połączeń nie oznacza automatycznie kompletnego ani poprawnego trackingu.

## Lokalna baza i opcja zespołowa

Edycja SQLite zapisuje dane w pliku na komputerze serwera. Nie wymaga kont ani osobnego silnika bazy. Kopia całej bazy obejmuje CRM, notatki, kampanie i historię agenta. Opcjonalny Supabase zapewnia konta, role, RLS i wspólny CRM; nowe moduły lokalne czekają na osobną migrację do chmury.

## Zakres obecnej wersji

Generator czyta publiczny HTML strony i do 4 wybranych podstron. Nie przeprowadza pełnego audytu internetu ani weryfikacji konkurentów. Nieznane dane są oznaczone; pomysły wymagają potwierdzenia. Agent działa po kliknięciu, bez harmonogramu, dowolnych poleceń lub samodzielnej publikacji. Ads jest importem CSV, Obsidian eksportem skarbca. Poczta nie synchronizuje skrzynki ani doręczeń.

Konfigurację, koszty, kopie i wszystkie przepływy opisuje [README](../README.md). Kierunki dalszej rozbudowy są w [roadmapie](ROADMAP.md).
