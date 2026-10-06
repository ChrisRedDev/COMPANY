\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.create_workspace('Automatyzacje') as wa \gset
select public.save_workspace(:'wa',0,'{"firms":[],"contacts":[],"deals":[],"tasks":[],"mails":[]}', '{"onboarded":true,"sender":"A","agentEnabled":false,"automation":{"jobs":[{"id":"j1","name":"Raport"}],"runs":[],"reports":[{"id":"r1"}]}}');
select set_config('test.wa',:'wa',true);
do $$ declare s jsonb; begin
 s := public.read_workspace(current_setting('test.wa')::uuid)->'settings';
 if s->'automation'->'jobs'->0->>'id' is distinct from 'j1' or s->'automation'->'reports'->0->>'id' is distinct from 'r1' then raise exception 'automation not stored: %', s; end if;
 begin perform public.save_workspace(current_setting('test.wa')::uuid,1,'{"firms":[],"contacts":[],"deals":[],"tasks":[],"mails":[]}','{"onboarded":true,"sender":"A","agentEnabled":false,"automation":{"jobs":"x"}}'); raise exception 'invalid automation accepted'; exception when raise_exception then if sqlerrm <> 'invalid_automation' then raise; end if; end;
 perform public.save_workspace(current_setting('test.wa')::uuid,1,'{"firms":[],"contacts":[],"deals":[],"tasks":[],"mails":[]}','{"onboarded":true,"sender":"A","agentEnabled":false}');
 s := public.read_workspace(current_setting('test.wa')::uuid)->'settings';
 if jsonb_array_length(s->'automation'->'jobs') <> 0 then raise exception 'default automation missing'; end if;
end $$;
rollback;
\echo 'PASS: automation settings stored, validated and defaulted'
