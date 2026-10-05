# Model danych

## Wdrożony fundament

| Tabela | Klucz / zastosowanie |
| --- | --- |
| profiles | id = auth.users.id; profil właściciela konta |
| workspaces | UUID, name, revision, settings JSONB, created_by |
| workspace_members | workspace_id + user_id, role owner/admin/marketer/viewer |
| companies | workspace_id + id tekstowy, payload obecnego Firm |
| contacts | workspace_id + id, company_id, payload |
| deals | workspace_id + id, company_id, payload |
| tasks | workspace_id + id, company_id, payload |
| mails | workspace_id + id, payload; historyczny odbiorca zachowany |
| audit_logs | workspace_id, actor_id, action, metadata, timestamp |

Tekstowe identyfikatory CRM pozwalają zachować starsze kopie (f1/c1 itd.). Relacje używają złożonych kluczy z workspace_id; rekord jednej przestrzeni nie może wskazać firmy innej przestrzeni. JSONB zachowuje kompatybilność formularzy; docelowe indeksowane kolumny powstają w kolejnych migracjach. Nie dodajemy pustych tabel, które udawałyby działające moduły.

## Docelowy model faz 2–8

Każdy rekord domenowy ma workspace_id i id. Każda relacja domenowa obejmuje workspace_id.

- leads: company/contact, source/medium/campaign/ad_group/keyword/search_term, gclid/msclkid, landing_page/device, first_touch/last_touch, conversion_type, status new/contacted/qualified/won/lost/spam, estimated_value/revenue.
- lead_events i events: session_id, lead_id, atrybucja, timestamp, metadata JSON. Typy page_view, scroll, cta_click, phone_click, phone_call, whatsapp_click, form_start, form_submit, thank_you_page, lead_created, qualified_lead, quote_sent, job_won, revenue.
- lead_sources: nazwa, provider, reguły atrybucji.
- campaigns/ad_groups/keywords/search_terms: provider_id, rodzic i metryki dzienne (spend/impressions/clicks/conversions/value), waluta, data i źródło importu.
- sessions: first/last touch, device, posthog_session_id opcjonalnie.
- landing_pages: URL, traffic/spend/leads/qualified, opcjonalne scores SEO/CRO/mobile/tracking z datą i metodą pomiaru (brak wyniku = null).
- integrations: provider, permissions, status, sync/error; wyłącznie referencja do chronionego sekretu.
- company_brain_documents: path/category, Markdown, content_hash, source_url, updated_at; scraping cache url/content/hash/scraped_at.
- agents/agent_runs: purpose/permissions/tools/context/model preference, task category, input/output tokens, koszt, status i wynik.
- recommendations: dowody, action, proposed payload, status pending/approved/rejected/executed/failed, approved_by/time, execution_id.
- reports: zakres, wersja wyliczeń, źródła, utrwalone KPI i interpretacja.
- automation_rules: trigger, conditions, proposed action, approval requirement, enabled.

RLS i role obowiązują we wszystkich przyszłych tabelach. Dane sekretów nie należą do payload. Ceny/konwersje nie mogą być łączone między walutami bez jawnego przeliczenia. Polska konfiguracja startowa: PLN, pl-PL, Europe/Warsaw.
