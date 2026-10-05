\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.create_workspace('Lead Hub A') as lead_wa \gset
select public.create_workspace('Lead Hub B') as lead_wb \gset
select set_config('test.lead_wa',:'lead_wa',true),set_config('test.lead_wb',:'lead_wb',true);
select set_config('test.lead_bundle',replace($lead_fixture$__LEAD_BUNDLE__$lead_fixture$,'__WORKSPACE__',:'lead_wa'),true) as fixture_saved \gset
select public.write_lead_hub(:'lead_wa',current_setting('test.lead_bundle')::jsonb,0,true) as lead_created \gset
select public.set_workspace_member(:'lead_wa','00000000-0000-0000-0000-000000000003','viewer');
do $$ declare w uuid := current_setting('test.lead_wa')::uuid; b jsonb := current_setting('test.lead_bundle')::jsonb; l jsonb; other jsonb; k text; r jsonb; begin
 if (select count(*) from public.leads where workspace_id=w)<>1 then raise exception 'lead creation failed'; end if;
 if (select count(*) from public.lead_events where workspace_id=w)<>11 then raise exception 'timeline failed'; end if;
 if (select count(*) from public.touchpoints where workspace_id=w)<>4 then raise exception 'touchpoints failed'; end if;
 if (select count(*) from public.conversions where workspace_id=w)<>6 then raise exception 'conversions failed'; end if;
 if (select count(*) from public.appointments where workspace_id=w)<>1 or (select count(*) from public.quotes where workspace_id=w)<>1 or (select count(*) from public.jobs where workspace_id=w)<>1 or (select count(*) from public.payments where workspace_id=w)<>1 then raise exception 'sales foundation failed'; end if;
 if (select revenue from public.leads where workspace_id=w)<>280 then raise exception 'revenue lost'; end if;
 if (public.read_lead_hub(w,'{"scope":"demo"}')->>'total')::integer<>1 then raise exception 'demo filter failed'; end if;
 l=b->'lead'; l=l || jsonb_build_object('id',gen_random_uuid()::text,'first_name','Nie nadpisuj');
 r=public.write_lead_hub(w,jsonb_set(b,'{lead}',l),0,true);
 if r->>'duplicate'<>'true' or r->'lead'->>'first_name'<>'Anna' then raise exception 'email duplicate overwrote data'; end if;
 other=b;
 foreach k in array array['events','touchpoints','conversions','appointments','quotes','jobs','payments'] loop other=jsonb_set(other,array[k],'[]'::jsonb); end loop;
 l=l || '{"email":"other@example.com","email_key":"other@example.com","phone":"+48 500 100 200","phone_key":"+48500100200","is_demo":false}'::jsonb;
 other=jsonb_set(other,'{lead}',l);
 perform public.write_lead_hub(w,other,0,true);
 l=(b->'lead') || jsonb_build_object('id',gen_random_uuid()::text,'email','new@example.com','email_key','new@example.com','phone','0048500100200','phone_key','+48500100200');
 r=public.write_lead_hub(w,jsonb_set(other,'{lead}',l),0,true);
 if r->>'duplicate'<>'true' then raise exception 'phone duplicate failed'; end if;
 l=l || '{"email":"lead.demo@example.com","email_key":"lead.demo@example.com"}'::jsonb;
 begin perform public.write_lead_hub(w,jsonb_set(other,'{lead}',l),0,true); raise exception 'ambiguous identity accepted'; exception when unique_violation then null; end;
 if (select count(*) from public.leads where workspace_id=w)<>2 then raise exception 'duplicate created a new lead'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ declare w uuid := current_setting('test.lead_wa')::uuid; begin
 if (select count(*) from public.leads)<>0 or (select count(*) from public.lead_events)<>0 or (select count(*) from public.payments)<>0 then raise exception 'lead workspace leak'; end if;
 begin perform public.read_lead_hub(w); raise exception 'cross read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.write_lead_hub(w,current_setting('test.lead_bundle')::jsonb,0,true); raise exception 'cross write allowed'; exception when insufficient_privilege then null; end;
 begin delete from public.leads; raise exception 'direct mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ declare w uuid := current_setting('test.lead_wa')::uuid; begin
 perform public.read_lead_hub(w);
 begin perform public.write_lead_hub(w,current_setting('test.lead_bundle')::jsonb,0,true); raise exception 'viewer mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.set_workspace_member(:'lead_wa','00000000-0000-0000-0000-000000000003','marketer');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ declare w uuid := current_setting('test.lead_wa')::uuid; b jsonb := current_setting('test.lead_bundle')::jsonb; bad jsonb; r jsonb; begin
 b=jsonb_set(b,'{lead}',(b->'lead') || '{"status":"qualified","revenue":900,"revision":2}'::jsonb);
 perform public.write_lead_hub(w,b,1,false);
 if (select revenue from public.leads where workspace_id=w and id=b->'lead'->>'id')<>900 then raise exception 'revenue update failed'; end if;
 begin perform public.write_lead_hub(w,b,1,false); raise exception 'stale write allowed'; exception when serialization_failure then null; end;
 bad=jsonb_set(b,'{lead,revision}','3'::jsonb);
 bad=jsonb_set(bad,'{events,0,workspace_id}',to_jsonb(current_setting('test.lead_wb')));
 begin perform public.write_lead_hub(w,bad,2,false); raise exception 'foreign event accepted'; exception when raise_exception then if sqlerrm<>'invalid_child_scope' then raise; end if; end;
 r=public.read_lead_hub(w,jsonb_build_object('id',b->'lead'->>'id'));
 if (r->'lead'->>'revision')::integer<>2 or jsonb_array_length(r->'events')<>11 or jsonb_array_length(r->'payments')<>1 then raise exception 'rollback lost timeline'; end if;
 if (select revision from public.workspaces where id=w)<>0 then raise exception 'Lead Hub changed CRM revision'; end if;
end $$;
rollback;
\echo 'PASS: Lead Hub creation, identities, timeline, sales, RLS, viewer/marketer, revisions and rollback'
