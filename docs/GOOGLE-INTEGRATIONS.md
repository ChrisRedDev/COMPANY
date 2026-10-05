# Google Analytics 4 i Search Console

Evolution Growth OS 0.5.0 odczytuje raporty przez oficjalne Google Analytics Data API i Search Console API. Konektory działają w **lokalnej edycji SQLite**. Nie instalują tagów, nie zmieniają konfiguracji witryny i nie zarządzają reklamami. Każda przestrzeń firmy przechowuje własny identyfikator usługi; dane uwierzytelnienia w `.env.local` dotyczą całej instalacji.

## Najprostsza konfiguracja: konto usługi Google

1. W swoim [projekcie Google Cloud](https://console.cloud.google.com/) włącz **Google Analytics Data API** i **Google Search Console API**.
2. W **IAM i administracja → Konta usługi** utwórz konto usługi. Sam dostęp do projektu Cloud nie daje dostępu do Analytics ani Search Console.
3. W **GA4 → Administracja → Zarządzanie dostępem do usługi** dodaj adres e-mail konta usługi z rolą **Przeglądający**. W **Search Console → Ustawienia → Użytkownicy i uprawnienia** dodaj ten sam adres do odpowiedniej witryny z dostępem do danych skuteczności. Wymaga to uprawnień do zarządzania dostępem; nie nadajesz roli właściciela aplikacji.
4. Utwórz klucz JSON konta usługi i zapisz go na swoim komputerze, np. w `data/google-service-account.json`. Jeśli organizacja blokuje klucze kont usług, użyj własnego OAuth opisanego poniżej. Nie publikuj tego pliku w repozytorium ani wklejaj go do czatu lub Company Brain. Na macOS/Linux możesz ograniczyć dostęp poleceniem `chmod 600 data/google-service-account.json`.
5. W `.env.local` wskaż plik:

```dotenv
GOOGLE_SERVICE_ACCOUNT_FILE=data/google-service-account.json
```

6. Zrestartuj aplikację przez `npm run dev:localdb` lub `npm run start:localdb` po właściwym buildzie. W **Konektorach** zapisz usługę:
   - **GA4:** numeryczny identyfikator z Administracja → Szczegóły usługi, np. `123456789`. Identyfikator pomiaru `G-…` nie jest identyfikatorem usługi.
   - **Search Console:** dokładna nazwa usługi, np. `sc-domain:twoja-firma.pl` lub `https://twoja-firma.pl/`. Domena, protokół, prefiks adresu i końcowy ukośnik muszą odpowiadać usłudze z dostępem.
7. Kliknij **Sprawdź odczyt**, a następnie **Pobierz statystyki**. Pierwszy przycisk wykonuje rzeczywisty odczyt i sprawdza uprawnienia; drugi dodatkowo zapisuje raport. Dopiero zapisane statystyki pojawiają się na **Pulpicie**. W trybie usługowym rozwiń **Wyniki marketingu, Google i kampanii**.

Pole wyboru usługi nie zapisuje kluczy. Token OAuth jest uzyskiwany na serwerze, nigdy w przeglądarce. Nie jest częścią bazy, raportów, eksportów ani kontekstu agenta. Aplikacja celowo nie używa automatycznie `GOOGLE_APPLICATION_CREDENTIALS` — to może być tożsamość platformy, niezwiązana z Twoją firmą.

## Alternatywa: własny OAuth

Wariant dla użytkownika, który ma już klienta OAuth i token odświeżania. Obecnie aplikacja nie ma przycisku logowania „Zaloguj przez Google” ani własnego przepływu uzyskiwania pierwszego tokenu.

Włącz obydwa API w projekcie klienta OAuth. Uzyskaj token odświeżania dla konta z dostępem do wybranych usług, zgodnie z [instrukcją Google OAuth dla aplikacji serwerowych](https://developers.google.com/identity/protocols/oauth2/web-server). Wymagane scope:

```text
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/webmasters.readonly
```

Ustaw po stronie serwera:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REFRESH_TOKEN=
```

Pozostaw `GOOGLE_SERVICE_ACCOUNT_FILE` pusty, jeśli wybierasz OAuth. Gdy obydwa warianty są skonfigurowane, plik konta usługi ma pierwszeństwo. Weryfikacja zależy od rzeczywistych uprawnień konta, zgody OAuth i stanu projektu. Tokeny z aplikacji OAuth w trybie testowym mogą wygasać; cofnięcie zgody także przerywa odczyt. Nie konfiguruj tokenów w zmiennych `NEXT_PUBLIC_*`.

## Co pokazuje raport

| Źródło         | Metryki                                                                                | Zakres                                                                 |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| GA4            | Sesje, użytkownicy, odsłony, kluczowe zdarzenia, przychód oraz kanały pozyskania sesji | Ostatnie 30 dni do wczoraj; daty danych odpowiadają strefie usługi GA4 |
| Search Console | Kliknięcia, wyświetlenia, CTR, średnia pozycja, przebieg dzienny i do 20 zapytań       | Typ Web, dane końcowe, ostatnie 30 dni zakończone 3 dni temu           |

Użytkownicy GA4 za cały okres pochodzą z osobnego raportu. Sumowanie użytkowników dziennych liczyłoby te same osoby wielokrotnie. Waluta przychodu pochodzi z metadanych GA4; nie zmieniamy jej etykiety na PLN. Kluczowe zdarzenia nie są automatycznie leadami ani kwalifikacją CRM. Ujemny przychód może wynikać ze zwrotów; jest zachowywany.

Dane Search Console mogą być opóźnione lub częściowo anonimizowane. CTR i średnia pozycja pochodzą z raportu Google, nie ze średniej wierszy zapytań. Łączny wynik witryny może różnić się od sumy widocznych zapytań. Raport GA4 ujawnia informację o progowaniu, próbkowaniu lub utracie danych, jeśli Google ją zwróci.

Wykres ma wybór metryki i tabelę danych. Kanały lub zapytania oraz ograniczenia raportu są rozwijane osobno. Wyniki nie są dodawane do kosztów, leadów czy revenue z CSV, ani do wpłat Lead Hub. Import CSV pozostaje źródłem statystyk Google Ads i Microsoft Ads; live Ads OAuth nie jest wdrożony.

## Stany połączenia i kopie

- **Wymaga konfiguracji:** brakuje poświadczeń lub zapisanej usługi. Nie oznacza udanego dostępu.
- **Gotowy do sprawdzenia:** konfiguracja jest obecna; dostęp potwierdzi odpowiedź API.
- **Odczyt API sprawdzony:** ostatnia operacja odczytu się powiodła. Data odczytu jest widoczna na karcie.
- **Błąd:** odczyt nie został ukończony. Poprzedni zapis pozostaje, z oznaczeniem błędu; data ostatniego sukcesu nie znika.
- **Wyłączony:** brak kolejnych synchronizacji i brak raportu na Pulpicie tej przestrzeni. Ponowne połączenie wymaga udanego sprawdzenia. Wyłączenie nie cofa uprawnień w Google.

Zmiana identyfikatora usługi usuwa jej stary zapis raportu i stan sukcesu w tej przestrzeni, aby nie pokazywać danych poprzedniej witryny. Raporty i wybór usługi znajdują się w pełnej kopii SQLite. Klucze, plik konta usługi i `.env.local` nie są częścią tej kopii — konfigurację odtwarzasz osobno.

## Diagnostyka

| Problem                 | Co sprawdzić                                                                    |
| ----------------------- | ------------------------------------------------------------------------------- |
| HTTP 400 przy tokenie   | Poprawny plik JSON/klucz, klient OAuth, refresh token i zgoda na scope          |
| HTTP 401                | Ważność danych uwierzytelnienia, cofnięta zgoda, stan konta                     |
| HTTP 403                | API włączone w projekcie oraz konto dodane do konkretnej usługi GA4/GSC         |
| HTTP 404                | Identyfikator GA4 lub dokładna nazwa usługi Search Console i prawo jej odczytu  |
| HTTP 429                | Limity API; poczekaj przed ponowieniem                                          |
| Pusty raport            | Wybrana usługa i zakres, ruch na stronie, opóźnienie przetwarzania danych       |
| GA4 nie pokazuje leadów | Skonfiguruj właściwe zdarzenia kluczowe w GA4; konektor nie instaluje trackingu |
| Błąd sieci              | Dostęp do Google API, proxy i lokalny firewall                                  |

Odczyty mają limit czasu 20 sekund na żądanie i odpowiedzi 2 MB. Przejściowe błędy 429/502/503/504 są ponawiane jeden raz. Równoległy odczyt tego samego konektora w jednej przestrzeni jest blokowany; synchronizacja nie działa w tle.

Potrzebne domeny: `oauth2.googleapis.com`, `analyticsdata.googleapis.com`, `www.googleapis.com`. Skrypt lokalny respektuje proxy HTTP/HTTPS, jeśli wersja Node obsługuje `--use-env-proxy`. W zarządzanym środowisku wymagany jest dostęp do tych domen w polityce sieciowej; aplikacja nie omija ograniczeń.

## Weryfikacja

Wydanie sprawdzono przez 46 testów Node (w tym rzeczywistą integrację SQLite), 11 testów lokalnej przeglądarki oraz regresję dotychczasowych trybów.

Testy obejmują podpis JWT konta usługi, OAuth refresh, kontrakty raportów GA4/GSC, walidację wartości, sanitizację błędów, ponowienie 429 i rzeczywistą bazę SQLite: oddzielne usługi firm, check/sync, zachowanie raportu po błędzie, wyłączenie i zmianę usługi. Testy przeglądarkowe sprawdzają konfigurację i raporty na Pulpicie, w tym widok mobilny. Odpowiedzi Google są jawnie mockowane; testy nie zastępują odczytu z Twojego konta.

W tej sesji nie ma skonfigurowanego konta Google z dostępem do GA4/GSC. Weryfikacja live wymaga wykonania kroku „Sprawdź odczyt” po konfiguracji. Screenshoty `google-*-demo.png` pokazują dane testowe, a nie wyniki kampanii użytkownika.

Referencje API: [GA4 batchRunReports](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/batchRunReports) · [Metryki GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema) · [Search Console query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) · [OAuth konta usługi](https://developers.google.com/identity/protocols/oauth2/service-account).
