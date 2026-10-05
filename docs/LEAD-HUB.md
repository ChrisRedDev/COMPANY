# Lead Hub — fundament Evolution Growth OS

Lead Hub jest osobną domeną obok CRM. Nie migruje automatycznie firm, kontaktów, szans ani istniejących zleceń usługowych. Dane są przypisane do przestrzeni firmy. SQLite używa oddzielnych tabel, Supabase dodatkowo chroni je członkostwem/RLS. Nowa migracja nie usuwa dotychczasowych danych.

## Kontrakt danych

- `leads`: dane kontaktowe, status, źródło/kampania/medium, UTM, landing page, keyword, first/last touch, estimated_value, revenue, notatki, revision, daty i jawny znacznik DEMO.
- `lead_events`: niezmienne zdarzenia z ID, workspace_id, lead_id, rodzajem, źródłem, czasem i metadata JSON.
- `touchpoints`: marketingowe interakcje z przypisaniem do eventu. First/last touch są porządkowane po czasie zdarzenia i ID, także przy dopisywaniu starszych interakcji.
- `conversions`: kamienie milowe formularza, kwalifikacji, oferty, rezerwacji, pracy i płatności. Ich wartości mają różne znaczenia; nie sumujemy ich jako przychodu.
- `appointments`, `quotes`, `jobs`, `payments`: podstawowe rekordy sprzedażowe odtwarzane ze zdarzeń. Są fundamentem dalszej rozbudowy, bez ERP, faktur czy integracji kalendarza.

`crm_links` rezerwuje przyszłe relacje company/contact/deal/customer. Obecnie jest pusty i nie ma automatycznej konwersji. Zlecenia `jobs` Lead Hub nie zastępują istniejącego `Deal.service`.

Dane finansowe są w PLN. Wpłata wymaga dodatniej kwoty; podnosi zapisany revenue. Zakończenie pracy nie potwierdza otrzymania pieniędzy. Revenue można też zadeklarować ręcznie; to wartość CRM, bez weryfikacji księgowej. Ręczny składnik jest zachowywany przy dodawaniu kolejnych zdarzeń. Uporządkowanie dat wstecznych odtwarza rekordy ofert/prac, bez podwójnego liczenia wpłat.

## Tożsamość i współbieżność

E-mail: trim i małe litery. Telefon: usunięcie separatorów, `00` → `+`, polskie 9 cyfr → `+48`; inne kraje wymagają prefiksu. Numery wewnętrzne nie są obsługiwane. Puste identyfikatory nie są łączone. Indeksy unique obejmują workspace + niepusty identyfikator.

Duplikat tworzenia zwraca istniejącego leada bez nadpisania kontaktu. Sprzeczne dopasowania e-mailu i telefonu są odrzucane. Nie wykonujemy automatycznego merge. Edycja odrzuca identyfikatory zajęte przez inny rekord.

Lead Hub ma własną `revision`; zapis nie podbija wersji snapshotu CRM. Zdarzenie ma stabilne ID i może zostać ponowione po niepewnej odpowiedzi. Inne dane dla tego samego ID powodują konflikt. Zapis leada, timeline i modeli pochodnych jest atomowy; stare wersje i obce relacje są odrzucane.

Listy są stronicowane po 50 rekordów; są filtry tekstu, statusu i DEMO. Limit historii: 5000 zdarzeń; pojedyncze metadata do 20 tys. znaków, cały zapis do 5 MB. Indeksy wspierają tożsamość, przestrzeń i kolejność timeline. Daty API są jednoznacznymi ISO z offsetem; w bazie reprezentują czas UTC.

## Endpointy

SQLite: `/api/local/workspaces/:workspace/leads`. Supabase: `/api/workspaces/:workspace/leads` z JWT sesji.

- `GET /`: lista i total; parametry `search`, `status`, `scope=all|real|demo`, `page`.
- `POST /`: utworzenie leada lub wynik `duplicate: true`.
- `GET /:id`: lead, timeline, touchpoints i rekordy sprzedaży.
- `PUT /:id`: edycja, wymagana bieżąca revision.
- `POST /:id/events`: zdarzenie, wymagane ID i revision.
- `POST /demo`: jawny, idempotentny przykład pełnego flow. Nie kontaktuje się z zewnętrznymi usługami.

SQLite wymaga loopback i bezpiecznego origin. Supabase używa JWT użytkownika i funkcji z kontrolą roli; żadnego service_role. Viewer ma tylko odczyt. Migracja: `supabase/migrations/202610050003_lead_hub.sql`, po wcześniejszych migracjach.

## Kopie i zakres

Pełna kopia SQLite obejmuje wszystkie nowe tabele. Kopia JSON CRM obejmuje wyłącznie wcześniejszy CRM, bez Lead Hub. W Supabase należy korzystać z kopii całej bazy projektu. Tryb samej przeglądarki zachowuje CRM; Lead Hub wymaga SQLite lub Supabase.

Nie ma live Ads/telefonii, automatycznego identyfikowania anonimowych wizyt ani multi-touch attribution. Kampanie są przypisane ręcznie lub przez zdarzenia; `campaign_days` pozostaje osobnym importem kosztów. CPL/CPQL/CAC/ROAS wymagają późniejszego, jawnego powiązania zakresów i źródeł. Zdarzenie ręczne nie potwierdza działania zewnętrznego konektora.
