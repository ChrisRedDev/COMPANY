begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default ''
);
create table public.workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 120),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 revision integer not null default 0,
 settings jsonb not null default '{"onboarded":false,"sender":"Zespół AI Evolution Polska","agentEnabled":false}'::jsonb
);
create table public.workspace_members (
 workspace_id uuid references public.workspaces(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','marketer','viewer')),
 primary key(workspace_id,user_id)
);
create function public.workspace_role(wid uuid) returns text
language sql stable security definer set search_path = '' as $$
 select role from public.workspace_members where workspace_id=wid and user_id=auth.uid();
$$;
create table public.companies (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null check(length(id) between 1 and 100),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'id'=id),
 primary key(workspace_id,id)
);
create table public.contacts (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 id text not null check(length(id) between 1 and 100), company_id text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'id'=id and payload->>'companyId'=company_id),
 primary key(workspace_id,id), foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete cascade
);
create table public.deals (like public.contacts including all);
alter table public.deals add foreign key(workspace_id) references public.workspaces(id) on delete cascade;
alter table public.deals add foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete cascade;
create table public.tasks (like public.contacts including all);
alter table public.tasks add foreign key(workspace_id) references public.workspaces(id) on delete cascade;
alter table public.tasks add foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete cascade;
create table public.mails (like public.companies including all);
alter table public.mails add foreign key(workspace_id) references public.workspaces(id) on delete cascade;
create table public.audit_logs (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profile_self on public.profiles for select to authenticated using(id=auth.uid());
alter table public.workspaces enable row level security;
create policy workspace_read on public.workspaces for select to authenticated using(public.workspace_role(id) is not null);
alter table public.workspace_members enable row level security;
create policy member_read on public.workspace_members for select to authenticated using(public.workspace_role(workspace_id) is not null);
alter table public.audit_logs enable row level security;
create policy audit_read on public.audit_logs for select to authenticated using(public.workspace_role(workspace_id) in ('owner','admin'));
do $$ declare t text; begin
 foreach t in array array['companies','contacts','deals','tasks','mails'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using(public.workspace_role(workspace_id) is not null)',t);
 end loop;
end $$;

create function public.create_workspace(workspace_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare wid uuid; begin
 if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
 if length(trim(workspace_name)) not between 1 and 120 then raise exception 'invalid_name'; end if;
 insert into public.profiles(id) values(auth.uid()) on conflict do nothing;
 insert into public.workspaces(name,created_by) values(trim(workspace_name),auth.uid()) returning id into wid;
 insert into public.workspace_members values(wid,auth.uid(),'owner');
 insert into public.audit_logs(workspace_id,actor_id,action) values(wid,auth.uid(),'workspace.created');
 return wid;
end $$;

create function public.read_workspace(wid uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare w public.workspaces; begin
 select * into w from public.workspaces where id=wid;
 if w.id is null then raise exception 'forbidden' using errcode='42501'; end if;
 return jsonb_build_object('revision',w.revision,'settings',w.settings,'data',jsonb_build_object(
 'firms',(select coalesce(jsonb_agg(payload order by id),'[]') from public.companies where workspace_id=wid),
 'contacts',(select coalesce(jsonb_agg(payload order by id),'[]') from public.contacts where workspace_id=wid),
 'deals',(select coalesce(jsonb_agg(payload order by id),'[]') from public.deals where workspace_id=wid),
 'tasks',(select coalesce(jsonb_agg(payload order by id),'[]') from public.tasks where workspace_id=wid),
 'mails',(select coalesce(jsonb_agg(payload order by id),'[]') from public.mails where workspace_id=wid)));
end $$;

create function public.save_workspace(wid uuid, expected_revision integer, crm jsonb, prefs jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare rev integer; t text; k text; begin
 if public.workspace_role(wid) not in ('owner','admin','marketer') or public.workspace_role(wid) is null then
 raise exception 'forbidden' using errcode='42501'; end if;
 select revision into rev from public.workspaces where id=wid for update;
 if rev<>expected_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
 if pg_column_size(crm)>5000000 then raise exception 'payload_too_large'; end if;
 foreach k in array array['firms','contacts','deals','tasks','mails'] loop
 if jsonb_typeof(crm->k) is distinct from 'array' or jsonb_array_length(crm->k)>10000 then raise exception 'invalid_payload'; end if;
 end loop;
 if jsonb_typeof(prefs->'onboarded') is distinct from 'boolean' or jsonb_typeof(prefs->'agentEnabled') is distinct from 'boolean'
 or jsonb_typeof(prefs->'sender') is distinct from 'string' or length(prefs->>'sender')>200 then raise exception 'invalid_settings'; end if;
 delete from public.contacts where workspace_id=wid;
 delete from public.deals where workspace_id=wid;
 delete from public.tasks where workspace_id=wid;
 delete from public.companies where workspace_id=wid;
 delete from public.mails where workspace_id=wid;
 insert into public.companies select wid,v->>'id',v from jsonb_array_elements(crm->'firms') v;
 foreach t in array array['contacts','deals','tasks'] loop
 execute format('insert into public.%I select $1,v->>''id'',v->>''companyId'',v from jsonb_array_elements($2) v',t) using wid,crm->t;
 end loop;
 insert into public.mails select wid,v->>'id',v from jsonb_array_elements(crm->'mails') v;
 update public.workspaces set revision=rev+1,settings=jsonb_build_object('onboarded',prefs->'onboarded','sender',prefs->'sender','agentEnabled',prefs->'agentEnabled') where id=wid;
 insert into public.audit_logs(workspace_id,actor_id,action,metadata) values(wid,auth.uid(),'crm.saved',jsonb_build_object('revision',rev+1));
 return rev+1;
end $$;

create function public.set_workspace_member(wid uuid, member_id uuid, member_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.workspaces where id=wid for update;
 if public.workspace_role(wid) is distinct from 'owner' then raise exception 'forbidden' using errcode='42501'; end if;
 if member_role not in ('owner','admin','marketer','viewer') then raise exception 'invalid_role'; end if;
 if exists(select 1 from public.workspace_members where workspace_id=wid and user_id=member_id and role='owner')
 and member_role<>'owner' and (select count(*) from public.workspace_members where workspace_id=wid and role='owner')<=1 then
 raise exception 'last_owner'; end if;
 insert into public.workspace_members values(wid,member_id,member_role) on conflict(workspace_id,user_id) do update set role=excluded.role;
 insert into public.audit_logs(workspace_id,actor_id,action,metadata) values(wid,auth.uid(),'member.role_changed',jsonb_build_object('user_id',member_id,'role',member_role));
end $$;

revoke all on public.profiles,public.workspaces,public.workspace_members,public.companies,public.contacts,public.deals,public.tasks,public.mails,public.audit_logs from anon;
revoke all on public.profiles,public.workspaces,public.workspace_members,public.companies,public.contacts,public.deals,public.tasks,public.mails,public.audit_logs from authenticated;
grant select on public.profiles,public.workspaces,public.workspace_members,public.companies,public.contacts,public.deals,public.tasks,public.mails,public.audit_logs to authenticated;
revoke all on function public.workspace_role(uuid),public.create_workspace(text),public.read_workspace(uuid),public.save_workspace(uuid,integer,jsonb,jsonb),public.set_workspace_member(uuid,uuid,text) from public;
grant execute on function public.workspace_role(uuid),public.create_workspace(text),public.read_workspace(uuid),public.save_workspace(uuid,integer,jsonb,jsonb),public.set_workspace_member(uuid,uuid,text) to authenticated;
commit;
