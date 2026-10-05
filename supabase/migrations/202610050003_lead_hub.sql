begin;
create function public.normalize_lead_phone(raw text) returns text
language plpgsql immutable set search_path='' as $$
declare n text; begin
 if btrim(raw)='' then return ''; end if;
 if raw !~ '^[+0-9 ().-]+$' then raise exception 'invalid_phone'; end if;
 n=regexp_replace(raw,'[ ().-]','','g');
 if left(n,2)='00' then n='+'||substring(n from 3); end if;
 if n ~ '^[0-9]{9}$' then n='+48'||n;
 elsif n ~ '^48[0-9]{9}$' then n='+'||n; end if;
 if n !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;
 return n;
end $$;
create table public.leads (
 id text not null check(id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 first_name text not null check(length(first_name)<=100),
 last_name text not null check(length(last_name)<=100),
 company_name text not null check(length(company_name)<=200),
 email text not null check(length(email)<=254),
 phone text not null check(length(phone)<=50),
 email_key text not null check(email_key=lower(btrim(email))),
 phone_key text not null check(phone_key=public.normalize_lead_phone(phone)),
 status text not null check(status in ('new','contacted','qualified','quote','booked','won','lost')),
 source text not null check(length(source)<=100),
 campaign text not null check(length(campaign)<=200),
 medium text not null check(length(medium)<=100),
 first_touch_source text not null,
 last_touch_source text not null,
 estimated_value double precision not null check(estimated_value between 0 and 1e12),
 revenue double precision not null check(revenue between 0 and 1e12),
 created_at timestamptz not null,
 updated_at timestamptz not null,
 revision integer not null check(revision>0),
 is_demo boolean not null,
 notes text not null check(length(notes)<=5000),
 landing_page text not null check(length(landing_page)<=1000),
 keyword text not null check(length(keyword)<=500),
 utm jsonb not null check(jsonb_typeof(utm)='object'),
 crm_links jsonb not null check(jsonb_typeof(crm_links)='object'),
 payload jsonb not null,
 primary key(workspace_id,id)
);
create unique index lead_email_identity on public.leads(workspace_id,email_key) where email_key<>'';
create unique index lead_phone_identity on public.leads(workspace_id,phone_key) where phone_key<>'';
create index lead_updated on public.leads(workspace_id,updated_at desc,id);
create table public.lead_events (
 id text not null,workspace_id uuid not null,lead_id text not null,event_type text not null check(event_type in ('ad_click','page_view','form_submit','phone_call','whatsapp','email','meeting','quote_sent','quote_accepted','booking_created','job_started','job_completed','payment_received','review_received','note_added','lead_created','status_change','lead_updated')),source text not null,timestamp timestamptz not null,metadata jsonb not null check(jsonb_typeof(metadata)='object'),
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 unique(workspace_id,lead_id,id)
);
create index lead_events_lead on public.lead_events(workspace_id,lead_id);
create table public.touchpoints (
 id text not null,workspace_id uuid not null,lead_id text not null,event_id text not null,source text not null,campaign text not null,medium text not null,timestamp timestamptz not null,
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 foreign key(workspace_id,lead_id,event_id) references public.lead_events(workspace_id,lead_id,id) on delete cascade
);
create index touchpoints_lead on public.touchpoints(workspace_id,lead_id);
create table public.conversions (
 id text not null,workspace_id uuid not null,lead_id text not null,event_id text not null,kind text not null,value double precision not null check(value between 0 and 1e12),currency text not null check(currency='PLN'),timestamp timestamptz not null,
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 foreign key(workspace_id,lead_id,event_id) references public.lead_events(workspace_id,lead_id,id) on delete cascade
);
create index conversions_lead on public.conversions(workspace_id,lead_id);
create table public.appointments (
 id text not null,workspace_id uuid not null,lead_id text not null,event_id text not null,status text not null check(status in ('booked','completed','cancelled')),scheduled_at timestamptz,created_at timestamptz not null,
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 foreign key(workspace_id,lead_id,event_id) references public.lead_events(workspace_id,lead_id,id) on delete cascade
);
create index appointments_lead on public.appointments(workspace_id,lead_id);
create table public.quotes (
 id text not null,workspace_id uuid not null,lead_id text not null,event_id text not null,status text not null check(status in ('sent','accepted','rejected')),amount double precision not null check(amount between 0 and 1e12),currency text not null check(currency='PLN'),created_at timestamptz not null,updated_at timestamptz not null,
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 foreign key(workspace_id,lead_id,event_id) references public.lead_events(workspace_id,lead_id,id) on delete cascade
);
create index quotes_lead on public.quotes(workspace_id,lead_id);
create table public.jobs (
 id text not null,workspace_id uuid not null,lead_id text not null,event_id text not null,status text not null check(status in ('in_progress','completed','cancelled')),amount double precision not null check(amount between 0 and 1e12),currency text not null check(currency='PLN'),created_at timestamptz not null,updated_at timestamptz not null,
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 foreign key(workspace_id,lead_id,event_id) references public.lead_events(workspace_id,lead_id,id) on delete cascade
);
create index jobs_lead on public.jobs(workspace_id,lead_id);
create table public.payments (
 id text not null,workspace_id uuid not null,lead_id text not null,event_id text not null,status text not null check(status='received'),amount double precision not null check(amount between 0 and 1e12),currency text not null check(currency='PLN'),timestamp timestamptz not null,
 payload jsonb not null check(payload->>'id'=id and payload->>'workspace_id'=workspace_id::text and payload->>'lead_id'=lead_id),
 primary key(workspace_id,id),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade,
 foreign key(workspace_id,lead_id,event_id) references public.lead_events(workspace_id,lead_id,id) on delete cascade
);
create index payments_lead on public.payments(workspace_id,lead_id);
create index lead_event_time on public.lead_events(workspace_id,lead_id,timestamp,id);
do $$ declare t text; begin
 foreach t in array array['leads','lead_events','touchpoints','conversions','appointments','quotes','jobs','payments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy lead_tenant_read on public.%I for select to authenticated using(public.workspace_role(workspace_id) is not null)',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create function public.read_lead_hub(wid uuid,params jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare lid text := params->>'id'; result jsonb; t text; k text; q text := coalesce(params->>'search',''); scope text := coalesce(params->>'scope','all'); st text := coalesce(params->>'status',''); p integer := coalesce((params->>'page')::integer,0); begin
 if public.workspace_role(wid) is null then raise exception 'forbidden' using errcode='42501'; end if;
 if params->>'identity'='true' then
 return (select coalesce(jsonb_agg(payload),'[]') from public.leads where workspace_id=wid and ((email_key<>'' and email_key=params->>'email_key') or (phone_key<>'' and phone_key=params->>'phone_key')));
 end if;
 if lid is not null then
 select jsonb_build_object('lead',payload) into result from public.leads where workspace_id=wid and id=lid;
 if result is null then raise exception 'lead_not_found' using errcode='42501'; end if;
 result=result || jsonb_build_object('events',(select coalesce(jsonb_agg(payload order by timestamp,id),'[]') from public.lead_events where workspace_id=wid and lead_id=lid));
 result=result || jsonb_build_object('touchpoints',(select coalesce(jsonb_agg(payload order by timestamp,id),'[]') from public.touchpoints where workspace_id=wid and lead_id=lid));
 result=result || jsonb_build_object('conversions',(select coalesce(jsonb_agg(payload order by timestamp,id),'[]') from public.conversions where workspace_id=wid and lead_id=lid));
 result=result || jsonb_build_object('appointments',(select coalesce(jsonb_agg(payload order by created_at,id),'[]') from public.appointments where workspace_id=wid and lead_id=lid));
 result=result || jsonb_build_object('quotes',(select coalesce(jsonb_agg(payload order by created_at,id),'[]') from public.quotes where workspace_id=wid and lead_id=lid));
 result=result || jsonb_build_object('jobs',(select coalesce(jsonb_agg(payload order by created_at,id),'[]') from public.jobs where workspace_id=wid and lead_id=lid));
 result=result || jsonb_build_object('payments',(select coalesce(jsonb_agg(payload order by timestamp,id),'[]') from public.payments where workspace_id=wid and lead_id=lid));
 return result;
 end if;
 if p<0 or p>100000 or length(q)>200 or scope not in ('all','real','demo') then raise exception 'invalid_filter'; end if;
 with filtered as (
 select * from public.leads where workspace_id=wid and (st='' or status=st) and (scope='all' or is_demo=(scope='demo'))
 and (q='' or strpos(lower(first_name||' '||last_name||' '||company_name||' '||email||' '||phone||' '||phone_key||' '||source||' '||campaign||' '||keyword),lower(q))>0)
 ) select jsonb_build_object('total',(select count(*) from filtered),'leads',(select coalesce(jsonb_agg(list_payload order by updated_at desc,id),'[]') from (select filtered.*,payload || jsonb_build_object('last_activity_at',(select max(timestamp) from public.lead_events where workspace_id=wid and lead_id=filtered.id)) as list_payload from filtered order by updated_at desc,id limit 50 offset p*50) page)) into result;
 return result;
end $$;
create function public.write_lead_hub(wid uuid,bundle jsonb,expected_revision integer,is_create boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare candidate jsonb := bundle->'lead'; lid text := candidate->>'id'; existing public.leads; duplicate public.leads; n integer; t text; k text; begin
 if public.workspace_role(wid) not in ('owner','admin','marketer') or public.workspace_role(wid) is null then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.workspaces where id=wid for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if pg_column_size(bundle)>5000000 or candidate->>'workspace_id' is distinct from wid::text or (candidate->>'revision')::integer is distinct from expected_revision+1 then raise exception 'invalid_lead_bundle'; end if;
 select * into existing from public.leads where workspace_id=wid and id=lid;
 select count(*) into n from public.leads where workspace_id=wid and (is_create or id<>lid) and ((email_key<>'' and email_key=candidate->>'email_key') or (phone_key<>'' and phone_key=candidate->>'phone_key'));
 if n>1 then raise exception 'ambiguous_identity' using errcode='23505'; end if;
 if n=1 then
 select * into duplicate from public.leads where workspace_id=wid and (is_create or id<>lid) and ((email_key<>'' and email_key=candidate->>'email_key') or (phone_key<>'' and phone_key=candidate->>'phone_key')) limit 1;
 if is_create then return jsonb_build_object('lead',duplicate.payload,'duplicate',true); else raise exception 'duplicate_identity' using errcode='23505'; end if;
 end if;
 if is_create and existing.id is not null then return jsonb_build_object('lead',existing.payload,'duplicate',true); end if;
 if (is_create and expected_revision<>0) or (not is_create and (existing.id is null or existing.revision<>expected_revision)) then raise exception 'revision_conflict' using errcode='40001'; end if;
 insert into public.leads(id,workspace_id,first_name,last_name,company_name,email,phone,email_key,phone_key,status,source,campaign,medium,first_touch_source,last_touch_source,estimated_value,revenue,created_at,updated_at,revision,is_demo,notes,landing_page,keyword,utm,crm_links,payload) select r.*,candidate from jsonb_to_record(candidate) as r(id text,workspace_id uuid,first_name text,last_name text,company_name text,email text,phone text,email_key text,phone_key text,status text,source text,campaign text,medium text,first_touch_source text,last_touch_source text,estimated_value double precision,revenue double precision,created_at timestamptz,updated_at timestamptz,revision integer,is_demo boolean,notes text,landing_page text,keyword text,utm jsonb,crm_links jsonb) on conflict(workspace_id,id) do update set first_name=excluded.first_name,last_name=excluded.last_name,company_name=excluded.company_name,email=excluded.email,phone=excluded.phone,email_key=excluded.email_key,phone_key=excluded.phone_key,status=excluded.status,source=excluded.source,campaign=excluded.campaign,medium=excluded.medium,first_touch_source=excluded.first_touch_source,last_touch_source=excluded.last_touch_source,estimated_value=excluded.estimated_value,revenue=excluded.revenue,created_at=excluded.created_at,updated_at=excluded.updated_at,revision=excluded.revision,is_demo=excluded.is_demo,notes=excluded.notes,landing_page=excluded.landing_page,keyword=excluded.keyword,utm=excluded.utm,crm_links=excluded.crm_links,payload=excluded.payload;
 delete from public.payments where workspace_id=wid and lead_id=lid;
 delete from public.jobs where workspace_id=wid and lead_id=lid;
 delete from public.quotes where workspace_id=wid and lead_id=lid;
 delete from public.appointments where workspace_id=wid and lead_id=lid;
 delete from public.conversions where workspace_id=wid and lead_id=lid;
 delete from public.touchpoints where workspace_id=wid and lead_id=lid;
 delete from public.lead_events where workspace_id=wid and lead_id=lid;
 if jsonb_typeof(bundle->'events') is distinct from 'array' or jsonb_array_length(bundle->'events')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'events') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.lead_events(id,workspace_id,lead_id,event_type,source,timestamp,metadata,payload) select r.*,v from jsonb_array_elements(bundle->'events') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_type text,source text,timestamp timestamptz,metadata jsonb);
 if jsonb_typeof(bundle->'touchpoints') is distinct from 'array' or jsonb_array_length(bundle->'touchpoints')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'touchpoints') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.touchpoints(id,workspace_id,lead_id,event_id,source,campaign,medium,timestamp,payload) select r.*,v from jsonb_array_elements(bundle->'touchpoints') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_id text,source text,campaign text,medium text,timestamp timestamptz);
 if jsonb_typeof(bundle->'conversions') is distinct from 'array' or jsonb_array_length(bundle->'conversions')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'conversions') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.conversions(id,workspace_id,lead_id,event_id,kind,value,currency,timestamp,payload) select r.*,v from jsonb_array_elements(bundle->'conversions') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_id text,kind text,value double precision,currency text,timestamp timestamptz);
 if jsonb_typeof(bundle->'appointments') is distinct from 'array' or jsonb_array_length(bundle->'appointments')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'appointments') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.appointments(id,workspace_id,lead_id,event_id,status,scheduled_at,created_at,payload) select r.*,v from jsonb_array_elements(bundle->'appointments') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_id text,status text,scheduled_at timestamptz,created_at timestamptz);
 if jsonb_typeof(bundle->'quotes') is distinct from 'array' or jsonb_array_length(bundle->'quotes')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'quotes') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.quotes(id,workspace_id,lead_id,event_id,status,amount,currency,created_at,updated_at,payload) select r.*,v from jsonb_array_elements(bundle->'quotes') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_id text,status text,amount double precision,currency text,created_at timestamptz,updated_at timestamptz);
 if jsonb_typeof(bundle->'jobs') is distinct from 'array' or jsonb_array_length(bundle->'jobs')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'jobs') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.jobs(id,workspace_id,lead_id,event_id,status,amount,currency,created_at,updated_at,payload) select r.*,v from jsonb_array_elements(bundle->'jobs') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_id text,status text,amount double precision,currency text,created_at timestamptz,updated_at timestamptz);
 if jsonb_typeof(bundle->'payments') is distinct from 'array' or jsonb_array_length(bundle->'payments')>5000 then raise exception 'invalid_child_collection'; end if;
 if exists(select 1 from jsonb_array_elements(bundle->'payments') r where r->>'workspace_id' is distinct from wid::text or r->>'lead_id' is distinct from lid) then raise exception 'invalid_child_scope'; end if;
 insert into public.payments(id,workspace_id,lead_id,event_id,status,amount,currency,timestamp,payload) select r.*,v from jsonb_array_elements(bundle->'payments') v cross join lateral jsonb_to_record(v) as r(id text,workspace_id uuid,lead_id text,event_id text,status text,amount double precision,currency text,timestamp timestamptz);
 insert into public.audit_logs(workspace_id,actor_id,action,metadata) values(wid,auth.uid(),case when is_create then 'lead.created' else 'lead.updated' end,jsonb_build_object('lead_id',lid,'revision',expected_revision+1));
 return jsonb_build_object('lead',candidate,'duplicate',false);
end $$;
revoke all on function public.read_lead_hub(uuid,jsonb) from public;
revoke all on function public.write_lead_hub(uuid,jsonb,integer,boolean) from public;
grant execute on function public.read_lead_hub(uuid,jsonb) to authenticated;
grant execute on function public.write_lead_hub(uuid,jsonb,integer,boolean) to authenticated;
commit;
