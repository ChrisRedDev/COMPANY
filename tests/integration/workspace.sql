\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.create_workspace('Firma A') as wa \gset
select public.create_workspace('Firma A2') as wa2 \gset
select public.set_workspace_member(:'wa','00000000-0000-0000-0000-000000000003','viewer');
select public.save_workspace(:'wa',0,'{"firms":[{"id":"f1","name":"Firma A"}],"contacts":[],"deals":[],"tasks":[],"mails":[]}', '{"onboarded":true,"sender":"A","agentEnabled":false,"businessMode":"services"}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.create_workspace('Firma B') as wb \gset
select public.save_workspace(:'wb',0,'{"firms":[{"id":"f1","name":"Firma B"}],"contacts":[],"deals":[],"tasks":[],"mails":[]}', '{"onboarded":false,"sender":"B","agentEnabled":false}');
select set_config('test.wa',:'wa',true),set_config('test.wb',:'wb',true),set_config('test.wa2',:'wa2',true);
do $$ begin
 if (select count(*) from public.workspaces)<>1 then raise exception 'workspace RLS leak'; end if;
 if (select count(*) from public.companies)<>1 then raise exception 'company RLS leak'; end if;
 if (select payload->>'name' from public.companies)<>'Firma B' then raise exception 'wrong company'; end if;
 begin perform public.read_workspace(current_setting('test.wa')::uuid); raise exception 'cross read accepted'; exception when insufficient_privilege then null; end;
 begin perform public.save_workspace(current_setting('test.wa')::uuid,1,'{}','{}'); raise exception 'cross write accepted'; exception when insufficient_privilege then null; end;
 begin perform public.set_workspace_member(current_setting('test.wa')::uuid,auth.uid(),'owner'); raise exception 'escalation accepted'; exception when insufficient_privilege then null; end;
 begin update public.workspaces set name='evil'; raise exception 'direct write accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
 if public.workspace_role(current_setting('test.wa')::uuid)<>'viewer' then raise exception 'role wrong'; end if;
 perform public.read_workspace(current_setting('test.wa')::uuid);
 begin perform public.save_workspace(current_setting('test.wa')::uuid,1,'{}','{}'); raise exception 'viewer write accepted'; exception when insufficient_privilege then null; end;
 if (select count(*) from public.audit_logs)<>0 then raise exception 'viewer audit leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ declare prefs jsonb := '{"onboarded":true,"sender":"A","agentEnabled":false,"businessMode":"services"}'; empty_crm jsonb := '{"firms":[],"contacts":[],"deals":[],"tasks":[],"mails":[]}'; begin
 begin perform public.save_workspace(current_setting('test.wa')::uuid,0,empty_crm,prefs); raise exception 'stale accepted'; exception when serialization_failure then null; end;
 begin perform public.save_workspace(current_setting('test.wa')::uuid,1,'{"firms":[],"contacts":[{"id":"c1","companyId":"f1"}],"deals":[],"tasks":[],"mails":[]}',prefs); raise exception 'orphan accepted'; exception when foreign_key_violation then null; end;
 if (select settings->>'businessMode' from public.workspaces where id=current_setting('test.wa')::uuid)<>'services' then raise exception 'business mode lost'; end if;
 begin perform public.save_workspace(current_setting('test.wa')::uuid,1,empty_crm,prefs || '{"businessMode":"invalid"}'::jsonb); raise exception 'invalid mode accepted'; exception when raise_exception then if sqlerrm<>'invalid_business_mode' then raise; end if; end;
 if (select count(*) from public.companies where workspace_id=current_setting('test.wa')::uuid)<>1 then raise exception 'rollback lost data'; end if;
 begin perform public.set_workspace_member(current_setting('test.wa')::uuid,auth.uid(),'viewer'); raise exception 'last owner removed'; exception when raise_exception then if sqlerrm<>'last_owner' then raise; end if; end;
 perform public.set_workspace_member(current_setting('test.wa')::uuid,'00000000-0000-0000-0000-000000000003','marketer');
 if (select revision from public.workspaces where id=current_setting('test.wa')::uuid)<>1 then raise exception 'conflict modified revision'; end if;
 if (select count(*) from public.audit_logs where workspace_id=current_setting('test.wa')::uuid)<>4 then raise exception 'audit wrong'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.save_workspace(:'wa',1,'{"firms":[],"contacts":[],"deals":[],"tasks":[],"mails":[]}', '{"onboarded":true,"sender":"A","agentEnabled":false,"businessMode":"services"}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.set_workspace_member(:'wa','00000000-0000-0000-0000-000000000003','admin');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
 if (select count(*) from public.audit_logs)=0 then raise exception 'admin audit blocked'; end if;
 begin perform public.set_workspace_member(current_setting('test.wa')::uuid,auth.uid(),'owner'); raise exception 'admin escalation accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'PASS: RLS, read/write isolation, viewer, marketer, role escalation, last owner, revision conflict, atomic rollback, audit'
