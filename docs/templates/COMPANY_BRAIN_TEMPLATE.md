# COMPANY BRAIN TEMPLATE

> Jeden plik jako główne źródło prawdy o firmie dla AI, marketingu, sprzedaży, SEO, contentu, automatyzacji i pracy agentów.

**Wersja:** 1.0\
**Ostatnia aktualizacja:** YYYY-MM-DD\
**Właściciel dokumentu:** [imię / firma]\
**Główna strona:** [URL]\
**Status:** TEMPLATE / DRAFT / ACTIVE

---

# 0. START HERE — INSTRUKCJA DLA AGENTA

## Cel

Ten plik ma być kompletnym kontekstem firmy. Traktuj go jako **primary source of truth** dla wszystkich zadań związanych z firmą.

Nie twórz osobnych plików z podstawowym kontekstem, jeżeli nie jest to konieczne. Logo, zdjęcia, materiały graficzne, dokumenty prawne i duże dane mogą być trzymane osobno, ale najważniejsza wiedza operacyjna o firmie ma być zebrana tutaj.

## Jak rozpocząć

Użytkownik może podać tylko adres strony internetowej, np.:

```text
START: https://example.com
```

Po otrzymaniu adresu strony wykonaj proces poniżej.

### ETAP 1 — Research firmy

Jeżeli masz dostęp do internetu / przeglądarki / wyszukiwarki:

1. Przejrzyj stronę główną.
2. Przejrzyj podstrony About / O nas.
3. Zidentyfikuj wszystkie usługi i produkty.
4. Sprawdź ceny, pakiety, promocje i warunki, jeżeli są publiczne.
5. Sprawdź Contact / Kontakt.
6. Sprawdź FAQ.
7. Sprawdź realizacje, portfolio, case studies i testimonials.
8. Sprawdź blog / aktualności / zasoby edukacyjne.
9. Znajdź oficjalne profile social media.
10. Sprawdź publiczne opinie i profile firmy, jeżeli są dostępne.
11. Zidentyfikuj główny obszar działania firmy.
12. Znajdź 3–7 najbardziej istotnych konkurentów w tym samym regionie lub segmencie.
13. Przeanalizuj podstawowy positioning konkurencji: oferta, komunikacja, ceny, social media, SEO i główne przewagi komunikowane przez konkurentów.
14. Zidentyfikuj prawdopodobne główne frazy SEO na podstawie usług, produktów, lokalizacji i treści strony.
15. Jeżeli można to wiarygodnie ustalić, zidentyfikuj używane platformy: CMS, ecommerce, booking, CRM, newsletter, analytics, reklamy, social media, automatyzacje.
16. Uzupełnij jak najwięcej sekcji tego dokumentu bez zadawania użytkownikowi pytań, na które odpowiedź można znaleźć publicznie.

Jeżeli nie masz dostępu do internetu, jasno zaznacz to i poproś użytkownika o stronę, eksport strony, screenshoty lub podstawowe dane. Nie udawaj, że research został wykonany.

### ETAP 2 — Zasady jakości danych

Nigdy nie zgaduj faktów o firmie.

Każdą informację klasyfikuj mentalnie jako:

- **CONFIRMED** — potwierdzone przez właściciela firmy lub oficjalne źródło.
- **TO CONFIRM** — prawdopodobne, ale wymaga potwierdzenia.
- **MISSING** — brak danych.

Jeżeli dane są dynamiczne, np. ceny, godziny otwarcia, promocje, dostępność, skład zespołu, liczba klientów, liczba realizacji lub oferta, zawsze zapisuj datę ostatniej weryfikacji.

Nie wymyślaj:

- cen,
- rabatów,
- wyników,
- liczby klientów,
- liczby realizacji,
- certyfikatów,
- gwarancji,
- partnerstw,
- nagród,
- opinii,
- czasu realizacji,
- danych kontaktowych,
- statystyk marketingowych.

### ETAP 3 — Hierarchia źródeł

Przy konfliktach informacji używaj tej kolejności:

1. Bezpośrednia informacja od właściciela / użytkownika.
2. Oficjalna strona firmy.
3. Oficjalne profile social media firmy.
4. Oficjalny Google Business Profile / wiarygodne profile firmowe.
5. Oficjalne dokumenty i materiały firmy.
6. Wiarygodne serwisy branżowe i katalogi.
7. Inne źródła publiczne.

Informacja z zewnętrznego źródła nie może nadpisywać informacji podanej bezpośrednio przez właściciela bez wyraźnego zaznaczenia konfliktu.

### ETAP 4 — Pytania uzupełniające

Po researchu **nie zadawaj kilkudziesięciu pytań**.

Przeanalizuj, czego nadal brakuje i zadaj użytkownikowi jedną krótką serię maksymalnie **5–8 pytań o najwyższej wartości**.

Pytaj przede wszystkim o rzeczy, których nie da się wiarygodnie ustalić publicznie, np.:

- która usługa lub produkt jest najważniejszy biznesowo,
- jakie są realne ceny, jeżeli nie są publiczne,
- kto jest najlepszym klientem,
- co faktycznie odróżnia firmę od konkurencji,
- jakie są obecne cele biznesowe,
- jakiego tonu komunikacji firma chce używać,
- jakie komunikaty lub obietnice są zabronione,
- jakie działania agent może wykonywać samodzielnie,
- jakie narzędzia firma wykorzystuje wewnętrznie,
- jakie KPI są najważniejsze.

Nie pytaj ponownie o informacje, które już znalazłeś.

### ETAP 5 — Finalizacja

Po odpowiedziach użytkownika:

1. Uzupełnij ten plik.
2. Usuń oczywiste placeholdery, które nie są potrzebne.
3. Oznacz brakujące dane jako `MISSING` zamiast zgadywać.
4. Zaktualizuj `Last verified` i changelog.
5. Podaj użytkownikowi krótkie podsumowanie:
   - co zostało potwierdzone,
   - czego nadal brakuje,
   - jakie 3–5 największych możliwości marketingowych zauważyłeś.

### ETAP 6 — Praca w przyszłości

Przed tworzeniem:

- reklam,
- postów,
- landing pages,
- stron internetowych,
- ofert,
- maili,
- SEO,
- automatyzacji,
- promptów,
- agentów,
- materiałów sprzedażowych,

najpierw przeczytaj ten dokument i działaj zgodnie z nim.

Jeżeli nowe informacje od użytkownika są sprzeczne z tym dokumentem, zapytaj lub zaktualizuj dokument. Nie opieraj kolejnych działań na starej wersji danych.

---

# 1. QUICK CONTEXT

> Ta sekcja ma dać agentowi najważniejszy kontekst w 30 sekund.

**Nazwa firmy:**\
**Pełna nazwa prawna:**\
**Branża:**\
**Jedno zdanie — czym firma się zajmuje:**\
**Główna lokalizacja:**\
**Obszar działania:**\
**Kraj / kraje:**\
**Języki:**\
**Website:**\
**Główny telefon:**\
**Główny e-mail:**\
**Główne CTA:**\
**Najważniejsza usługa / produkt:**\
**Główny klient:**\
**Główna przewaga:**\
**Główne kanały marketingowe:**\
**Najważniejszy obecny cel biznesowy:**\
**Najważniejsza zasada dla AI:**\
**Last verified:** YYYY-MM-DD

---

# 2. IDENTYFIKACJA FIRMY

## 2.1 Dane podstawowe

**Nazwa marki:**\
**Pełna nazwa firmy:**\
**Trading name:**\
**Forma prawna:**\
**Rok założenia:**\
**Numer rejestracyjny:**\
**VAT / Tax ID:**\
**Founder / właściciel:**\
**Główne osoby kontaktowe:**\
**Liczba pracowników / wielkość zespołu:**\

## 2.2 Czym zajmuje się firma

### Jedno zdanie

[Proste wyjaśnienie bez korporacyjnego języka.]

### Krótki opis

[2–4 zdania.]

### Pełny opis

- Co firma robi?
- Dla kogo?
- Jaki problem rozwiązuje?
- W jakim modelu działa?
- Co klient kupuje w praktyce?

## 2.3 Model biznesowy

- [ ] B2C
- [ ] B2B
- [ ] Local Service
- [ ] Ecommerce
- [ ] SaaS
- [ ] Subscription
- [ ] Marketplace
- [ ] Agency
- [ ] Consulting
- [ ] Education
- [ ] Other:

---

# 3. LOKALIZACJA I OBSZAR DZIAŁANIA

**Siedziba:**\
**Adres:**\
**Miasto:**\
**Region:**\
**Kod pocztowy:**\
**Kraj:**\

## Service area

**Główny obszar:**\
**Miasta:**\
**Regiony:**\
**Kraje:**\
**Maksymalny zasięg dojazdu:**\
**Usługi zdalne:** TAK / NIE\

## Godziny operacyjne

| Dzień | Godziny |
|---|---|
| Poniedziałek | |
| Wtorek | |
| Środa | |
| Czwartek | |
| Piątek | |
| Sobota | |
| Niedziela | |

**Obsługa poza godzinami:**\
**Emergency / 24h service:**\
**Last verified:**

---

# 4. KONTAKT I LINKI

**Website:**\
**Contact page:**\
**Phone:**\
**WhatsApp:**\
**Email ogólny:**\
**Email sprzedażowy:**\
**Email support:**\
**Booking link:**\
**Quote / wycena:**\
**Google Maps:**\
**Google Business Profile:**\
**Review link:**\

## Social media

**Facebook:**\
**Instagram:**\
**LinkedIn:**\
**TikTok:**\
**YouTube:**\
**X:**\
**Threads:**\
**Pinterest:**\
**Discord:**\
**Other:**\

---

# 5. OFERTA — PRODUCTS & SERVICES

> To jedna z najważniejszych sekcji dokumentu. Nie używaj ogólników. Zapisuj konkretnie co klient kupuje.

## Priorytet oferty

**Usługa / produkt #1 do promowania:**\
**Usługa / produkt #2:**\
**Usługa / produkt #3:**\

## Template pojedynczej usługi / produktu

### [NAZWA USŁUGI / PRODUKTU]

**Kategoria:**\
**Priorytet:** HIGH / MEDIUM / LOW\
**Dla kogo:**\
**Problem klienta:**\
**Opis:**\
**Co klient otrzymuje:**\
**Rezultat:**\
**Cena:**\
**Cena od:**\
**Model ceny:** fixed / hourly / subscription / quote / other\
**Czas realizacji:**\
**Co wchodzi w cenę:**\
**Czego cena nie obejmuje:**\
**Gwarancja:**\
**Warunki:**\
**Dostępność:**\
**Upsell:**\
**Cross-sell:**\
**Główne CTA:**\
**URL:**\
**Last verified:**\

> Skopiuj powyższy blok dla każdej istotnej usługi lub produktu.

## Pakiety / abonamenty

| Pakiet | Cena | Dla kogo | Co zawiera | Limit / warunki | CTA |
|---|---:|---|---|---|---|
| | | | | | |

## Promocje

**Aktualna promocja:**\
**Data rozpoczęcia:**\
**Data zakończenia:**\
**Warunki:**\
**Status:** ACTIVE / INACTIVE\

---

# 6. IDEALNY KLIENT

## 6.1 Primary customer

**Typ klienta:**\
**B2B / B2C:**\
**Wiek:**\
**Lokalizacja:**\
**Dochód / budżet:**\
**Zawód / branża:**\
**Typ firmy:**\
**Stanowisko decyzyjne:**\
**Wielkość firmy:**\

## 6.2 Sytuacja klienta

**Co się dzieje, zanim zacznie szukać firmy:**\
**Największy problem:**\
**Największa frustracja:**\
**Największe ryzyko z jego perspektywy:**\
**Czego najbardziej chce:**\
**Czego chce uniknąć:**\

## 6.3 Buying triggers

-
-
-

## 6.4 Co przekonuje klienta

- [ ] Cena
- [ ] Opinie
- [ ] Gwarancja
- [ ] Termin
- [ ] Portfolio
- [ ] Lokalność
- [ ] Doświadczenie
- [ ] Certyfikaty
- [ ] Szybka odpowiedź
- [ ] Wygoda
- [ ] Finansowanie
- [ ] Inne:

## 6.5 Obiekcje

| Obiekcja | Co klient naprawdę ma na myśli | Jak odpowiadamy |
|---|---|---|
| | | |

## 6.6 Język klienta

**Frazy, których używa klient:**\
**Pytania, które zadaje:**\
**Słowa branżowe:**\
**Słowa, których nie rozumie:**\

## 6.7 Segmenty dodatkowe

### Segment 2

[opis]

### Segment 3

[opis]

---

# 7. POSITIONING I PRZEWAGI

## 7.1 Dlaczego klient ma wybrać tę firmę

> Maksymalnie 3–5 mocnych powodów. Bez pustych haseł typu „wysoka jakość”.

1.
2.
3.
4.
5.

## 7.2 Konkretne dowody

- Liczba lat na rynku:
- Liczba klientów:
- Liczba realizacji:
- Średnia ocena:
- Liczba opinii:
- Gwarancja:
- Certyfikaty:
- Partnerstwa:
- Awards:
- Inne:

## 7.3 Brand promise

[Co firma obiecuje klientowi i za co bierze odpowiedzialność.]

## 7.4 Czego NIE używać jako przewagi

- „Najlepsza jakość” bez dowodu.
- „Najlepsi na rynku” bez podstaw.
- „Najtańsi” bez potwierdzenia.
- Niepotwierdzone rankingi.
- Niepotwierdzone liczby.

---

# 8. FAKTY, LICZBY I CLAIMS

> Lista faktów, które agent może bezpiecznie wykorzystywać w marketingu.

| Fakt / claim | Wartość | Status | Źródło | Last verified |
|---|---|---|---|---|
| | | CONFIRMED / TO CONFIRM | | |

## Liczby, których agent NIE może zmyślać

- liczba klientów,
- liczba realizacji,
- liczba lat doświadczenia,
- oszczędności klienta,
- ROI,
- oceny i reviews,
- terminy realizacji,
- rabaty,
- ceny,
- gwarancje,
- zasięg działania,
- certyfikaty.

---

# 9. BRAND VOICE — JAK FIRMA MÓWI

## 9.1 Ton

**Formalność:** formalny / neutralny / luźny\
**Zwracamy się:** Pan/Pani / po imieniu / „ty”\
**Energia komunikacji:**\
**Poziom techniczny:** prosty / średni / ekspercki\
**Humor:**\
**Emojis:**\

## 9.2 Firma brzmi jak

-
-
-

## 9.3 Firma NIE brzmi jak

-
-
-

## 9.4 Słowa i zwroty, których używamy

-
-
-

## 9.5 Słowa i zwroty, których unikamy

-
-
-

## 9.6 Przykłady prawdziwej komunikacji

### Post social media

```text
[Wklej 1–3 autentyczne przykłady]
```

### Wiadomość do klienta

```text
[Przykład]
```

### E-mail

```text
[Przykład]
```

### Oferta / reklama

```text
[Przykład]
```

---

# 10. BRAND VISUAL — JAK FIRMA WYGLĄDA

## Logo

**Główne logo:**\
**Logo alternatywne:**\
**Folder z assetami:**\
**Zasady użycia:**\

## Kolory

| Rola | HEX / RGB |
|---|---|
| Primary | |
| Secondary | |
| Accent | |
| Background | |
| Surface | |
| Text | |

## Fonty

**Headline:**\
**Body:**\
**Alternative:**\

## Styl wizualny

**Fotografia:**\
**Oświetlenie:**\
**Kompozycja:**\
**Tło:**\
**Grafiki:**\
**Ikony:**\
**Motion:**\
**Video:**\

## Image generation rules

-
-
-

## Czego unikać wizualnie

-
-
-

---

# 11. WEBSITE

**URL:**\
**CMS / platforma:**\
**Hosting:**\
**Domain provider:**\
**DNS:**\
**CDN / Cloudflare:**\
**Ecommerce:**\
**Booking system:**\
**Payments:**\

## Najważniejsze strony

| Strona | URL | Cel | Główne CTA |
|---|---|---|---|
| Home | | | |
| About | | | |
| Services | | | |
| Contact | | | |
| Pricing | | | |
| FAQ | | | |

## Główna konwersja strony

[Co ma zrobić użytkownik?]

## Problemy strony

-
-
-

## Możliwości poprawy

-
-
-

---

# 12. SOCIAL MEDIA

## Aktywne platformy

| Platforma | URL / handle | Status | Cel | Częstotliwość |
|---|---|---|---|---|
| Instagram | | ACTIVE / INACTIVE | | |
| Facebook | | | | |
| LinkedIn | | | | |
| TikTok | | | | |
| YouTube | | | | |

## Najlepiej działające formaty

-
-
-

## Obecny styl contentu

[opis]

## Content gaps

-
-
-

---

# 13. MARKETING STACK

## Paid ads

**Meta Ads:**\
**Google Ads:**\
**TikTok Ads:**\
**LinkedIn Ads:**\
**Microsoft Ads:**\

## Analytics

**GA4:**\
**Google Tag Manager:**\
**Search Console:**\
**Meta Pixel:**\
**TikTok Pixel:**\
**Microsoft Clarity:**\
**Hotjar:**\

## CRM / Sales

**CRM:**\
**Lead management:**\
**Pipeline:**\
**Quote system:**\

## Email

**Provider:**\
**Newsletter platform:**\
**Automations:**\

## Social media management

**Platform:**\
**Scheduler:**\

## Automation

**n8n:**\
**Make:**\
**Zapier:**\
**Custom:**\
**AI Agents:**\

## Inne systemy

-
-

---

# 14. CURRENT MARKETING — CO FIRMA ROBI TERAZ

## Kanały pozyskania klientów

1.
2.
3.

## Organic

[opis]

## Paid

[opis]

## Offline

[opis]

## Referral / polecenia

[opis]

## Aktualne kampanie

| Kampania | Kanał | Oferta | Audience | Status | KPI |
|---|---|---|---|---|---|
| | | | | | |

## Co obecnie działa

-
-
-

## Co obecnie nie działa

-
-
-

---

# 15. LEAD GENERATION I SALES FUNNEL

## Domyślny customer flow

```text
Traffic / Referral
↓
Website / Social / Landing Page
↓
Call / Form / DM / Booking
↓
Qualification
↓
Quote / Consultation
↓
Follow-up
↓
Sale
↓
Delivery
↓
Review
↓
Referral / Repeat purchase
```

## Źródła leadów

-
-
-

## Jak klient się zgłasza

**Preferowany kanał:**\
**Formularz:**\
**Telefon:**\
**WhatsApp:**\
**DM:**\

## Response SLA

**Docelowy czas odpowiedzi:**\
**Godziny odpowiedzi:**\
**Kto odpowiada:**\

## Qualification

**Jakie informacje musimy zebrać od leada:**

1.
2.
3.

## Follow-up

**Po ilu godzinach / dniach:**\
**Ile follow-upów:**\
**Kanały:**\

## Gotowe odpowiedzi

### Pierwsza odpowiedź

```text
[template]
```

### Prośba o dodatkowe informacje

```text
[template]
```

### Follow-up

```text
[template]
```

---

# 16. CUSTOMER JOURNEY

## Awareness

**Co klient widzi:**\
**Co myśli:**\
**Content:**\

## Consideration

**Co porównuje:**\
**Najważniejsze pytania:**\
**Dowody:**\

## Decision

**Co go przekonuje:**\
**Największa obiekcja:**\

## Purchase

**Jak wygląda zakup:**\

## Delivery

**Jak wygląda realizacja:**\

## Aftercare

**Follow-up:**\
**Review:**\
**Referral:**\
**Repeat purchase:**\

---

# 17. REVIEWS, SOCIAL PROOF I TRUST

**Google rating:**\
**Liczba reviews:**\
**Facebook rating:**\
**Trustpilot:**\
**Inne platformy:**\

## Najmocniejsze opinie

1.
2.
3.

## Case studies

| Case | Problem | Rozwiązanie | Wynik | URL |
|---|---|---|---|---|
| | | | | |

## Certyfikaty

-
-

## Gwarancje

-
-

## Partnerstwa

-
-

---

# 18. KONKURENCJA

> Analizuj fakty i publiczne pozycjonowanie. Nie wymyślaj „słabości” konkurenta bez dowodów.

## Competitor 1 — [NAZWA]

**Website:**\
**Location:**\
**Service area:**\
**Oferta:**\
**Ceny publiczne:**\
**Główny positioning:**\
**Główne CTA:**\
**SEO widoczne publicznie:**\
**Social media:**\
**Paid ads:**\
**Reviews:**\
**Mocne strony obserwowane:**\
**Luki / różnice względem naszej firmy:**\
**Source URLs:**\

> Powtórz dla 3–7 najważniejszych konkurentów.

## Porównanie

| Obszar | Nasza firma | Konkurent A | Konkurent B | Konkurent C |
|---|---|---|---|---|
| Oferta | | | | |
| Cena | | | | |
| Reviews | | | | |
| Social | | | | |
| SEO | | | | |
| Speed | | | | |
| Guarantee | | | | |
| Brand | | | | |

## Competitive gaps

[Jakie potrzeby klientów są słabo obsługiwane przez rynek?]

## Opportunities

[Co firma może zrobić inaczej lub lepiej bez składania niepotwierdzonych twierdzeń o konkurencji?]

---

# 19. SEO

## Primary commercial keywords

-
-
-

## Local SEO keywords

- `[service] + [city]`
- `[service] near me`
- `[product] + [region]`

## Informational keywords

-
-
-

## Problem-aware keywords

-
-
-

## Product / service clusters

### Cluster 1

**Main keyword:**\
**Secondary keywords:**\
**Search intent:**\
**Target page:**\

## Locations to target

-
-
-

## Existing SEO assets

- Service pages:
- Location pages:
- Blog:
- FAQ:
- Schema:
- Google Business Profile:

## SEO opportunities

1.
2.
3.

## SEO notes

Nie wpisuj wolumenu wyszukiwań, trudności keywordów lub pozycji Google, jeżeli nie zostały sprawdzone aktualnym narzędziem SEO.

---

# 20. CONTENT STRATEGY

## Główne content pillars

1. **Education:**
2. **Problems:**
3. **Proof / results:**
4. **Behind the scenes:**
5. **Offer:**
6. **FAQ:**
7. **Local / community:**

## Formaty

- Short video
- Long video
- Carousel
- Static image
- Before / After
- Case study
- Blog
- Newsletter
- FAQ
- Testimonial

## Tematy wysokiego priorytetu

1.
2.
3.
4.
5.

## Content rules

- Jeden materiał = jeden główny temat.
- Najpierw problem / sytuacja klienta.
- Potem rozwiązanie.
- Następnie proof / konkret.
- Na końcu jasne CTA.

---

# 21. PAID ADS CONTEXT

## Primary ad objective

[leads / sales / bookings / calls / traffic / awareness]

## Primary offer

[opis]

## Primary audience

[opis]

## Locations

[lista]

## Creative angles

1. Problem
2. Outcome
3. Social proof
4. Comparison
5. Speed
6. Convenience
7. Local expert
8. Price / value

## Claims allowed in ads

-
-

## Claims prohibited / wymagające potwierdzenia

-
-

## Landing page

**URL:**\
**CTA:**\
**Tracking:**\

---

# 22. BUSINESS GOALS I KPI

## Current priority

[Jedno najważniejsze zadanie biznesowe na teraz.]

## 3 miesiące

-
-

## 6 miesięcy

-
-

## 12 miesięcy

-
-

## KPI

| KPI | Current | Target | Period | Source |
|---|---:|---:|---|---|
| Leads | | | | |
| Revenue | | | | |
| Conversion rate | | | | |
| CPL | | | | |
| ROAS | | | | |
| Organic traffic | | | | |
| Reviews | | | | |

---

# 23. PROBLEMY I OPPORTUNITIES

## Największe problemy biznesowe

1.
2.
3.

## Marketing problems

1.
2.
3.

## Sales problems

1.
2.
3.

## Website problems

1.
2.
3.

## Operational problems

1.
2.
3.

## Opportunities

1.
2.
3.

---

# 24. AI & AUTOMATION

## Current AI tools

-
-

## Current automations

| Workflow | Tool | Trigger | Action | Status |
|---|---|---|---|---|
| | | | | |

## Automation opportunities

### Lead handling

-

### Customer support

-

### Content

-

### Email

-

### CRM

-

### Reporting

-

### SEO

-

### Admin

-

---

# 25. AI AGENT OPERATING RULES

> Ta sekcja mówi agentowi, co wolno robić samodzielnie.

## Agent MAY

- wykonywać research publicznych informacji,
- przygotowywać drafty,
- analizować konkurencję,
- tworzyć pomysły,
- przygotowywać treści zgodne z tym dokumentem,
- proponować optymalizacje,
- aktualizować ten plik na podstawie potwierdzonych informacji.

## Agent MUST ASK BEFORE

- publikacją treści,
- wysłaniem wiadomości w imieniu firmy,
- zmianą cen,
- uruchomieniem kampanii reklamowej,
- wydaniem pieniędzy,
- zmianą produkcyjnej strony,
- usunięciem danych,
- zmianą automatyzacji wpływającej na klientów,
- użyciem niepotwierdzonego claimu.

## Agent MUST NEVER

- wymyślać faktów,
- wymyślać cen,
- wymyślać opinii,
- tworzyć fałszywych case studies,
- podszywać się pod klienta,
- publikować bez zgody, jeżeli nie ma takiego uprawnienia,
- przechowywać haseł, tokenów lub sekretów w tym pliku,
- używać danych prywatnych bez potrzeby.

## Kiedy agent ma dopytać

Zapytaj, gdy:

- informacja wpływa na cenę,
- informacja wpływa na prawdziwość reklamy,
- istnieją sprzeczne źródła,
- dane są nieaktualne,
- decyzja wymaga właściciela,
- działanie jest nieodwracalne lub kosztowne.

---

# 26. COMPLIANCE, RYZYKO I ZAKAZANE CLAIMS

## Regulacje branżowe

[Jeżeli dotyczy]

## Claims wymagające dowodu

-
-

## Claims zabronione

-
-

## Tematy wymagające zatwierdzenia

-
-

---

# 27. SYSTEMS & ACCESS MAP

> Tutaj zapisujemy wyłącznie nazwy systemów i linki. **Nigdy haseł, API keys, recovery codes ani sekretów.**

| Obszar | System | URL | Owner | Notes |
|---|---|---|---|---|
| Website | | | | |
| Hosting | | | | |
| Domain | | | | |
| Email | | | | |
| CRM | | | | |
| Booking | | | | |
| Payments | | | | |
| Analytics | | | | |
| Ads | | | | |
| Social | | | | |
| Automation | | | | |
| AI | | | | |
| Cloud files | | | | |
| GitHub | | | | |

**Credentials location:** [np. 1Password / Bitwarden / company vault]

---

# 28. IMPORTANT LINKS

**Website:**\
**Google Business:**\
**Google Maps:**\
**Google Drive:**\
**Brand assets:**\
**Canva:**\
**Figma:**\
**GitHub:**\
**Meta Business Manager:**\
**Meta Ads Manager:**\
**Google Ads:**\
**Google Analytics:**\
**Search Console:**\
**CRM:**\
**Booking:**\
**Newsletter:**\
**Review page:**\
**Dashboard:**\
**Other:**\

---

# 29. CURRENT PROJECTS

| Project | Cel | Status | Priority | Owner | Deadline | Link |
|---|---|---|---|---|---|---|
| | | | | | | |

---

# 30. OPEN QUESTIONS

> Agent powinien utrzymywać tę listę krótko. Po uzyskaniu odpowiedzi przenieś informację do właściwej sekcji i usuń pytanie.

1.
2.
3.
4.
5.

---

# 31. SOURCE REGISTRY

> Źródła użyte podczas researchu. Dzięki temu później wiadomo skąd pochodzi informacja.

| ID | Źródło | URL | Typ | Data sprawdzenia | Notes |
|---|---|---|---|---|---|
| S01 | Official website | | Official | | |
| S02 | Instagram | | Official social | | |
| S03 | Google Business | | Official listing | | |
| S04 | Competitor | | Competitor website | | |

---

# 32. DATA FRESHNESS

## Dane wymagające częstej weryfikacji

| Dane | Jak często sprawdzać | Ostatnia weryfikacja |
|---|---|---|
| Ceny | przed publikacją / ofertą | |
| Promocje | przed publikacją | |
| Godziny otwarcia | co 1–3 miesiące | |
| Team | co 3 miesiące | |
| Oferta | co 1–3 miesiące | |
| Social links | co 6 miesięcy | |
| Reviews / rating | przed użyciem w reklamie | |
| Liczba klientów / realizacji | przed użyciem w reklamie | |

---

# 33. AGENT FINAL CHECK BEFORE OUTPUT

Przed oddaniem materiału dotyczącego firmy sprawdź:

- [ ] Czy treść jest zgodna z ofertą firmy?
- [ ] Czy cena jest potwierdzona?
- [ ] Czy wszystkie liczby są potwierdzone?
- [ ] Czy CTA prowadzi do właściwego miejsca?
- [ ] Czy używam właściwego tonu marki?
- [ ] Czy nie wymyśliłem claimu?
- [ ] Czy materiał jest skierowany do właściwego klienta?
- [ ] Czy lokalizacja / region są poprawne?
- [ ] Czy linki i dane kontaktowe są aktualne?
- [ ] Czy dynamiczne dane zostały zweryfikowane?

---

# 34. CHANGELOG

## YYYY-MM-DD — v1.0

**Added:**\
- Initial company research.

**Updated:**\
-

**Confirmed by owner:**\
-

**Still missing:**\
-

---

# QUICK START FOR A NEW COMPANY

Skopiuj ten plik do folderu nowej firmy i nazwij go:

```text
COMPANY_BRAIN.md
```

Następnie napisz agentowi tylko:

```text
Przeczytaj COMPANY_BRAIN.md.
START: https://adres-firmy.pl

Zrób pełny research firmy zgodnie z instrukcją w pliku.
Najpierw sam uzupełnij wszystko, co możesz potwierdzić publicznie.
Dopiero na końcu zadaj mi maksymalnie 5–8 najważniejszych pytań, których nie dało się ustalić z researchu.
Nie zgaduj danych.
Po moich odpowiedziach zaktualizuj COMPANY_BRAIN.md i traktuj go od tej chwili jako główne źródło wiedzy o firmie.
```

---

# ZASADA SYSTEMU

> **Dobry kontekst sprawia, że agent nie zaczyna każdego zadania od zera.**\
> Najpierw firma jest opisana raz porządnie. Potem AI korzysta z tego kontekstu przy każdej reklamie, stronie, poście, mailu, analizie, automatyzacji i decyzji operacyjnej.
