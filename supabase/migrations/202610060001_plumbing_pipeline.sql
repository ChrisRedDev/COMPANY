-- Keep existing rows and RLS; new UK lead details remain in the existing JSON payload.
alter table public.leads drop constraint leads_status_check;
alter table public.leads add constraint leads_status_check check(status in ('new','contacted','qualified','quote','booked','in_progress','completed','paid','lost','won'));
alter table public.conversions drop constraint conversions_currency_check;
alter table public.conversions add constraint conversions_currency_check check(currency in ('GBP','PLN'));
alter table public.quotes drop constraint quotes_currency_check;
alter table public.quotes add constraint quotes_currency_check check(currency in ('GBP','PLN'));
alter table public.jobs drop constraint jobs_currency_check;
alter table public.jobs add constraint jobs_currency_check check(currency in ('GBP','PLN'));
alter table public.payments drop constraint payments_currency_check;
alter table public.payments add constraint payments_currency_check check(currency in ('GBP','PLN'));
