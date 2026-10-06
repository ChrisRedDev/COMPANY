# Evolution Growth OS — Twoja firma, wiedza i działanie

**Produkt AI Evolution Polska. Lokalny CRM, obsługa usług, Company Brain i agent AI dla firm w Polsce.**

Wiedza o firmie często jest rozproszona: oferta na stronie, ustalenia w wiadomościach, kontakty w arkuszu, pomysły w notatkach. Evolution Growth OS zbiera je w jednym jasnym obszarze pracy. Pomaga zobaczyć stan sprzedaży, zachować kontekst marki i przygotować konkretny kolejny krok.

## Firma opisana raz, kontekst na kolejne zadania

Podajesz adres strony, wybierasz model i dostajesz szkic Company Brain. Główny dokument obejmuje 34 sekcje: firmę, ofertę, klientów, markę, marketing, źródła i brakujące informacje. Powiązane notatki porządkują ofertę, markę i pomysły marketingowe. Sprawdzasz szkic, uzupełniasz wiedzę właściciela i zapisujesz. Każda kolejna rozmowa z agentem może korzystać z tego kontekstu, w granicach limitu danych opisanych w README.

Wiedza pozostaje przenośna: Markdown, foldery i wikilinki. Eksport ZIP otworzysz jako skarbiec Obsidiana. Nie ma automatycznej synchronizacji plików między aplikacjami.

## Od kontaktu do współpracy

Dodajesz firmę, kontakt, szansę sprzedaży i zadanie. Wartość jest w PLN, NIP przechodzi walidację, a terminy są liczone według Europe/Warsaw. Pulpit sprzedaży oraz marketingu pokazuje wartości wynikające z danych, które zapiszesz lub zaimportujesz.

## Usługi od pierwszego terminu do historii klienta

Przełączasz sposób pracy na firmę usługową. Zapisujesz kontakt i ustalenia z klientem, rezerwujesz termin oraz przypisujesz osobę lub stanowisko. Aplikacja sprawdza, czy aktywne prace nie nakładają się. Po zakończeniu historia pozostaje na karcie klienta. Pulpit pokazuje najbliższe rezerwacje, ich wartość i wykonane realizacje. Możesz wrócić do widoku sprzedaży B2B, zachowując obie grupy danych.

Jasne szkło, subtelne gradienty i czytelne liczby porządkują widok. Wykresy odpowiadają na wybór okresu oraz wskaźnika; wartości odczytasz także w tabeli. Trzy kroki onboardingu prowadzą przez wybór sposobu pracy, pierwszy zapis i opcjonalne e-maile oraz AI.

## Model wybierasz sam

OpenRouter API udostępnia wybór modeli. Zalogowane lokalne CLI Codex i Claude Code pozwalają korzystać z dostępów własnego konta. Agent analizuje dane wybranej firmy, odpowiada i proponuje zadania lub notatki. Ty sprawdzasz i zatwierdzasz zmianę. Koszty oraz limity zależą od dostawcy.

## Źródła, które mają konkretną rolę

WordPress importuje publiczne strony do wiedzy firmy. PostHog odczytuje agregaty zdarzeń. CSV kampanii zasila metryki marketingowe. Resend wysyła zatwierdzone szkice; program pocztowy otwiera wiadomość przez mailto. Statusy pokazują konfigurację i wynik odczytu. Żadne z tych połączeń nie oznacza automatycznie kompletnego ani poprawnego trackingu.

## Lokalna baza i opcja zespołowa

Edycja SQLite zapisuje dane w pliku na komputerze serwera. Nie wymaga kont ani osobnego silnika bazy. Kopia całej bazy obejmuje CRM, notatki, kampanie i historię agenta. Opcjonalny Supabase zapewnia konta, role, RLS i wspólny CRM; moduły wiedzy, marketingu i AI czekają na osobną migrację do chmury. Lead Hub działa także w Supabase po migracji 003.

## Zakres obecnej wersji

Generator czyta publiczny HTML strony i do 4 wybranych podstron. Nie przeprowadza pełnego audytu internetu ani weryfikacji konkurentów. Nieznane dane są oznaczone; pomysły wymagają potwierdzenia. Agent działa po kliknięciu, bez harmonogramu, dowolnych poleceń lub samodzielnej publikacji. Ads ma lokalny odczyt API oraz niezależny import CSV; Obsidian korzysta z eksportu skarbca. Poczta nie synchronizuje skrzynki ani doręczeń.

Konfigurację, koszty, kopie i wszystkie przepływy opisuje [README](../README.md). Kierunki dalszej rozbudowy są w [roadmapie](ROADMAP.md).

## Lead Hub · 0.4.0

Dodano moduł pozyskiwania i obsługi leadów obok CRM, dostępny w SQLite i Supabase. Zapisuje kontakt, status, źródła, kampanie, UTM, zdarzenia i touchpoints; chronologicznie wyznacza first/last touch. Deduplikacja wykorzystuje e-mail lub telefon, a konflikty tożsamości i wersji chronią przed przypadkowym nadpisaniem. Oferty, rezerwacje, prace, konwersje i wpłaty stanowią osobny fundament sprzedaży. Demo jest jawnie oznaczone i idempotentne. Lista, karta historii, filtry, eksport JSON i mobilny interfejs zachowują dotychczasowy CRM.

SQLite inicjalizuje nowe tabele przy pierwszym użyciu modułu. Supabase wymaga migracji 003 po 001 i 002; stosuje członkostwo przestrzeni i kontrolę ról. Zapis leada i jego historii jest transakcyjny, z osobną revision, bez zmiany snapshotu CRM. Nie ma automatycznej konwersji do istniejących firm/zleceń, live Ads/telefonii ani połączenia kosztów z atrybucją; te integracje pozostają kolejnym krokiem. Szczegóły: [LEAD-HUB.md](LEAD-HUB.md).

## Statystyki Google · 0.5.0

Dodano lokalne konektory Google Analytics 4 i Search Console, wybór usługi osobno dla przestrzeni, uwierzytelnienie kontem usługi lub własnym OAuth, ręczny odczyt i zapis raportów w SQLite. Pulpit pokazuje osobne metryki, wykresy, kanały i zapytania. Nie sumujemy ich z wynikami CSV lub wpłatami CRM. Błędy zachowują poprzedni zapis i datę sukcesu, a wyłączenie konektora ukrywa jego raport. Zmiana usługi czyści stary raport tej przestrzeni. HTTP ma timeout, limit odpowiedzi i jedno ponowienie błędów przejściowych. Ten etap wprowadził raporty GA4/GSC; rozwinięcie OAuth i Ads opisuje wersja 0.7.0 poniżej. Konfiguracja i granice w [GOOGLE-INTEGRATIONS.md](GOOGLE-INTEGRATIONS.md).

## Google OAuth i Ads · 0.7.0

Lokalne SQLite: logowanie przez Google, osobny szyfrowany token dla firmy, wybór GA4/GSC/Ads z listy i konta pod MCC. Ads używa oficjalnego REST v25 i pokazuje koszt, konwersje, wartość konwersji, CTR, CPC, CPA i ROAS, wykresy i kampanie. Kwoty mają walutę konta; raport obejmuje 30 zakończonych dni w jego strefie czasowej. Nie łączymy go automatycznie z kosztami CSV, atrybucją Lead Hub lub wpłatami CRM. Brak zmian reklam, harmonogramu i tych konektorów w Supabase.

OAuth: jednorazowy state, PKCE S256, cookie HttpOnly/SameSite Lax przypisane do logowania, limit 10 minut i powrót wyłącznie na lokalny host. Callback GET ma wąski wyjątek cross-site; pozostałe API zachowuje ochronę origin. Sekrety i tokeny nie trafiają do odpowiedzi UI. Skarbiec AES-256-GCM leży obok bazy w katalogu `.google-oauth`, ma oddzielny klucz i wiąże rekord z firmą oraz klientem OAuth. Eksport SQLite pomija ten katalog. Zmiana konta czyści wybór usług i stare raporty; równoległy odczyt nie może zapisać raportu wcześniejszego połączenia. Szczegółowa [instrukcja Google](GOOGLE-INTEGRATIONS.md).
