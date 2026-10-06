# Google OAuth, GA4, Search Console i Google Ads

Evolution Growth OS **0.7.0** w lokalnej edycji SQLite ma logowanie Google przez przeglądarkę, wybór usług firmy i ręczne pobieranie raportów. Google Ads działa przez oficjalne API, a CSV pozostaje osobną opcją. Konektory nie zarządzają kampaniami, nie instalują tagów i nie synchronizują danych w tle.

## 1. Jednorazowa konfiguracja klienta OAuth

1. Uruchom aplikację **na swoim komputerze**: `npm run dev:localdb`, otwórz `http://localhost:3000` i utwórz firmę. W **Konektorach → Adres powrotny i instrukcja konfiguracji** odczytaj dokładny URI. Domyślnie: `http://localhost:3000/api/local/google/callback`.
2. W [Google Cloud](https://console.cloud.google.com/) wybierz projekt. Włącz **Google Analytics Data API**, **Google Analytics Admin API** (lista usług), **Google Search Console API**, a dla reklam także **Google Ads API**.
3. W Google Auth Platform skonfiguruj Branding, Audience oraz Data Access. Dla własnego konta możesz użyć External / Testing i dodać swój adres jako testowego użytkownika. Organizacja Workspace może użyć właściwej konfiguracji Internal. W trybie External / Testing token odświeżania dla tych zakresów zwykle wygasa po 7 dniach. Publikacja dla innych użytkowników może wymagać weryfikacji Google; aplikacja nie omija tego procesu.
4. Utwórz **OAuth client ID → Web application**. Dodaj URI z kroku 1 w **Authorized redirect URIs**. `localhost` i `127.0.0.1` oraz różne porty to różne URI: dodaj używane adresy osobno, wraz z dokładną ścieżką, bez końcowego ukośnika.
5. Skopiuj `.env.example` do `.env.local`, zachowując swoje istniejące ustawienia. Wpisz sekrety wyłącznie do lokalnego pliku:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=twoj-klient.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=twoj-sekret
# Opcjonalnie wymuś dokładny adres aplikacji:
# GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/local/google/callback
```

Zrestartuj serwer. Nie publikuj `.env.local`, kluczy ani skarbca. Przy uruchamianiu produkcyjnym po zmianie kodu zbuduj ponownie `npm run build:localdb`, potem `npm run start:localdb`.

## 2. Podłączenie firmy i wybór usług

1. W Konektorach kliknij **Połącz przez Google**. Wybierz konto Google i zaakceptuj wszystkie żądane usługi. Dostęp do projektu Cloud sam w sobie nie daje dostępu do danych GA4/GSC/Ads.
2. Po powrocie do tej samej firmy kliknij **Wczytaj dostępne usługi** przy GA4 lub Search Console. Wybierz usługę i kliknij **Zapisz usługę**. Możesz wpisać identyfikator ręcznie, gdy np. konto usługi nie ma dostępu do Admin API.
3. GA4 wymaga numerycznego identyfikatora usługi, np. `123456789`, a nie identyfikatora pomiarowego `G-…`. Konto musi mieć co najmniej rolę Przeglądający w usłudze. GSC używa dokładnej nazwy, np. `sc-domain:twoja-firma.pl` albo `https://twoja-firma.pl/`, i dostępu do skuteczności witryny.
4. **Sprawdź odczyt** wykonuje rzeczywiste żądanie API. **Pobierz statystyki** zapisuje raport w SQLite. Zapisany raport pojawia się także na Pulpicie. Każde odświeżenie wykonujesz ręcznie.

„Google połączone” oznacza zapis zgody i tokenu, a nie dostęp do wszystkich kont. „Odczyt API sprawdzony” potwierdza odczyt wybranej usługi. Nie potwierdza poprawności tagów ani konfiguracji konwersji.

## 3. Google Ads bez CSV i konta agencji

Google Ads wymaga dodatkowo **tokenu deweloperskiego**, niezależnego od klienta OAuth:

1. W swoim **koncie menedżera Google Ads (MCC) → Centrum API** uzyskaj token deweloperski. Google przyznaje poziom dostępu; **Test Account Access** obsługuje konta testowe, a konta produkcyjne wymagają odpowiedniego zatwierdzenia. Samo wpisanie tokenu nie zmienia tego poziomu.
2. Dodaj do `.env.local` i zrestartuj serwer:

```dotenv
GOOGLE_ADS_DEVELOPER_TOKEN=twoj-token-deweloperski
GOOGLE_ADS_API_VERSION=v25
```

3. Zaznacz **Dołącz Google Ads** w panelu konta. Jeśli Google było już połączone, kliknij **Zmień konto lub zgodę Google**, aby udzielić scope `adwords`. Zmiana połączenia czyści stare wybory i raporty Google tej firmy; nie usuwa CRM, wiedzy ani CSV.
4. **Wczytaj dostępne usługi** w karcie Ads pokazuje numery kont z bezpośrednim dostępem. Wybierz numer konta reklamowego. Alternatywnie wpisz numer w formacie `123-456-7890`.
5. Agencja: wpisz numer menedżera w **Numer menedżera MCC**, kliknij **Wczytaj konta pod menedżerem MCC** i wybierz klienta. Lista dzieci zawiera nazwy i oznacza kolejne MCC. Po wybraniu zagnieżdżonego menedżera możesz wczytać następny poziom. Menedżer musi mieć dostęp do klienta; sam token deweloperski nie przyznaje go. MCC nie jest końcowym kontem reklamowym do raportu.
6. Zapisz usługę, sprawdź odczyt i pobierz statystyki.

Zakres Google Ads `https://www.googleapis.com/auth/adwords` pozwala również na zarządzanie reklamami; Google nie udostępnia osobnego zakresu wyłącznie do statystyk Ads. **Ta aplikacja wykonuje tylko listowanie i zapytania SELECT, bez endpointów mutate.** Nie tworzy kampanii, nie zmienia budżetów ani reklam. GA4/GSC proszą o `analytics.readonly` i `webmasters.readonly`.

REST domyślnie używa **v25**, potwierdzonej w oficjalnym [SDK Google Ads Python](https://github.com/googleads/google-ads-python/tree/main/google/ads/googleads/v25). Google wycofuje starsze wersje; administrator może zmienić `GOOGLE_ADS_API_VERSION` na nadal obsługiwaną wersję zgodną z używanymi polami. Nie ma automatycznego przełączania wersji przy błędzie.

## 4. Co oznaczają wyniki

| Raport             | Zakres i znaczenie                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GA4**            | Ostatnie 30 dni do wczoraj według daty Europe/Warsaw; API stosuje ustawienia raportowe usługi. Sesje, użytkownicy całego okresu, odsłony, kluczowe zdarzenia, przychód i kanały. Użytkownicy nie są sumą dziennych użytkowników. Waluta pochodzi z API; Google może progować lub próbkować dane. |
| **Search Console** | 30 dni kończące się 3 dni temu; Web, dane końcowe, agregacja witryny. Kliknięcia, wyświetlenia, CTR, średnia pozycja i do 20 zapytań. Anonimizacja zapytań powoduje różnice między listą a sumami. Google stosuje własną strefę raportową.                                                       |
| **Google Ads**     | 30 zakończonych dni w strefie konta; waluta konta, bez przeliczenia na PLN. Koszt z `cost_micros` dzielony przez milion. Konwersje mogą być ułamkowe i aktualizowane z opóźnieniem. Do 20 kampanii według kosztu.                                                                                |

Ads: CTR = kliknięcia / wyświetlenia, CPC = koszt / kliknięcia, CPA = koszt / konwersje, ROAS = wartość konwersji / koszt. Kreska oznacza brak mianownika. Wartość konwersji z Google nie jest potwierdzoną wpłatą w CRM. Raporty Google pozostają osobne od CSV i Lead Hub: aplikacja nie dodaje tych samych kosztów dwukrotnie i nie buduje jeszcze atrybucji leadów z API reklam.

## 5. Tokeny, kopie i odłączanie

Token odświeżania po zalogowaniu jest szyfrowany **AES-256-GCM**, przypisany do firmy i klienta OAuth. Dla domyślnej bazy pliki leżą w `data/evolution.sqlite.google-oauth/`: `key` oraz oddzielne pliki `.enc`. Katalog ma prawa 700, pliki 600 tam, gdzie system obsługuje te uprawnienia. Na Windows dostęp zależy również od ACL użytkownika. Folder jest ignorowany przez Git i nie znajduje się w eksporcie SQLite. To ochrona zapisu na dysku; użytkownik mający dostęp do pliku klucza i tokenów może je odczytać.

Po odtworzeniu kopii bazy na innym komputerze **zaloguj Google ponownie**. Nie dołączaj skarbca do kopii udostępnianej innym. Jeśli świadomie przenosisz całą instalację wraz ze zgodami, zachowaj cały skarbiec i jego klucz, zgodne identyfikatory firm oraz klienta OAuth, a także ograniczenia dostępu do plików. Zmiana klienta wymaga ponownego logowania. Brak klucza nie powoduje nadpisania go nowym, gdy istnieją zaszyfrowane rekordy.

- **Wyłącz w przestrzeni** zatrzymuje odczyt pojedynczego konektora i ukrywa jego zapisany raport; nie cofa zgody Google.
- **Usuń lokalne połączenie Google** usuwa token firmy, wybory usług i zapisane raporty Google tej firmy. Dane CRM, wiedza, CSV i połączenia pozostałych firm pozostają zapisane. Starsza konfiguracja `.env.local` dotyczy całej instalacji i pozostaje osobna.
- **Zmień konto lub zgodę Google** zastępuje połączenie dopiero po udanym logowaniu. Anulowanie, niepełna zgoda lub błąd wymiany tokenu zachowują poprzednie połączenie. Sukces czyści poprzednie wybory i raporty, aby nie pokazywać wyników innego konta.
- Dostęp po stronie Google cofniesz na [stronie uprawnień konta Google](https://myaccount.google.com/permissions). Aplikacja nie wywołuje globalnego revoke, który mógłby unieważnić zgody używane w innych firmach.

Logowanie korzysta z jednorazowego state, PKCE S256 i cookie HttpOnly / SameSite Lax przypisanego do przeglądarki. Wygasa po 10 minutach lub restarcie serwera. Callback ma wyjątek cross-site wyłącznie dla GET na dokładnej lokalnej ścieżce; wymaga poprawnego state i cookie. Kod wymieniany jest wyłącznie na serwerze, bez automatycznego ponowienia wymiany. Tokeny nie są zwracane do UI, localStorage, notatek ani audytu.

## 6. Zaawansowane alternatywy

**Konto usługi — GA4/GSC:** utwórz service account w Google Cloud, pobierz jego JSON do chronionego pliku, np. `data/google-service-account.json`, i dodaj adres e-mail konta do usługi GA4 oraz Search Console. W `.env.local` ustaw `GOOGLE_SERVICE_ACCOUNT_FILE=data/google-service-account.json`. Nie używamy automatycznie platformowego `GOOGLE_APPLICATION_CREDENTIALS`. GA4 Admin API wymaga dostępu do listy kont; gdy lista jest pusta, identyfikator wpisz ręcznie. Ads w tej implementacji wymaga OAuth użytkownika.

**Własny token odświeżania:** ustaw `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` oraz `GOOGLE_OAUTH_REFRESH_TOKEN` uzyskany dla tych samych zakresów. Konfiguracja jest wspólna dla instalacji. Browser OAuth zapisane dla konkretnej firmy ma pierwszeństwo; nie następuje automatyczny fallback po błędzie jego tokenu. Przy braku logowania firmy plik konta usługi ma pierwszeństwo dla GA4/GSC, a Ads używa tokenu OAuth z env.

## 7. Diagnostyka i dostęp do sieci

| Problem                       | Co sprawdzić                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Przycisk logowania wyłączony  | Client ID i secret w `.env.local`; restart serwera; tryb SQLite.                                                                  |
| `redirect_uri_mismatch`       | Dokładny URI z panelu, host localhost vs 127.0.0.1, port i ścieżka; klient musi być typu Web.                                     |
| Anulowanie lub niepełna zgoda | Rozpocznij ponownie i zaznacz wszystkie żądane usługi. Dla Ads zaznacz zgodę adwords.                                             |
| Wygasłe logowanie             | Zacznij ponownie w Konektorach; wróć w tej samej przeglądarce, bez zmiany hosta lub restartu serwera.                             |
| HTTP 401 / błąd odświeżania   | Zaloguj Google ponownie; sprawdź wygaśnięcie tokenów Testing i cofnięcie zgody.                                                   |
| HTTP 403 / brak listy         | Włącz wymagane API w projekcie klienta i nadaj kontu dostęp do konkretnej usługi.                                                 |
| Ads HTTP 400/403              | Sprawdź poziom tokenu deweloperskiego, numer konta, MCC i zgodę OAuth. Konto menedżera nie ma raportu kampanii.                   |
| Ads HTTP 404                  | Sprawdź konto i nadal obsługiwaną wersję API.                                                                                     |
| Błąd skarbca                  | Przywróć właściwy klucz ze skarbca lub odłącz i zaloguj ponownie. Nie zmieniaj klienta bez ponownego logowania.                   |
| Brak danych / zero            | Sprawdź okres, konto i faktyczne dane. Kluczowe zdarzenia/konwersje wymagają konfiguracji u dostawcy.                             |
| Timeout / błąd sieci          | Połączenie, proxy i polityka domen. Błąd nie jest oznaczany jako udany odczyt; pozostaje poprzedni raport z informacją o błędzie. |

Wymagane domeny: `accounts.google.com` (przeglądarka), `oauth2.googleapis.com`, `analyticsadmin.googleapis.com`, `analyticsdata.googleapis.com`, `www.googleapis.com`, `googleads.googleapis.com` (serwer). Zarządzane środowisko musi mieć je dozwolone; aplikacja respektuje politykę i proxy. Nie wymaga konfiguracji VPN.

API ma limit 20 sekund na żądanie, 2 MB odpowiedzi, jedno ponowienie 429/502/503/504 dla odczytów i odświeżania tokenu. Listy i raporty mają limity stron/wierszy; ich przekroczenie nie zapisuje częściowego raportu. Ads ma do 10 000 wierszy i 20 stron; GA4 listuje do 2000 usług i 10 stron. Odczyt tej samej integracji w firmie jest szeregowany; zmiana połączenia lub usługi podczas odczytu odrzuca stary wynik.

## 8. Weryfikacja

W połączonym wydaniu 0.7.0 przeszło **59 testów Node**, **13 testów przeglądarkowych SQLite** i **5 testów regresji cloud**. Przeszły także TypeScript, ESLint oraz produkcyjny build lokalny.

Testy Node sprawdzają OAuth z PKCE, cookies, single-use, wygasanie, anulowanie, zakresy, szyfrowanie, brak sekretów w rzeczywistej kopii SQLite, izolację firm, zmianę konta podczas odczytu oraz kontrakty GA4/GSC/Ads, metryki, paginację i MCC. Testy przeglądarkowe sprawdzają wybór usług, powrót logowania, konfigurację, raporty, odłączenie, pulpit i telefon.

**Odpowiedzi Google w testach i screenshotach są jawnie mockowane.** Ta sesja nie ma danych OAuth ani dostępu do Twoich kont; odczyt live potwierdzisz dopiero po własnej konfiguracji przyciskiem **Sprawdź odczyt**. Screenshoty `google-*-demo.png` pokazują dane testowe.

Referencje: [OAuth Web server](https://developers.google.com/identity/protocols/oauth2/web-server) · [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/batchRunReports) · [GA4 Admin API](https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list) · [Search Console](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) · [Token deweloperski Ads](https://developers.google.com/google-ads/api/docs/get-started/dev-token) · [Dostęp MCC](https://developers.google.com/google-ads/api/docs/concepts/call-structure) · [Google Ads Search](https://developers.google.com/google-ads/api/rest/common/search).
