-- Run inside a transaction and roll back. All identities and tasks are temporary.
do $test$
declare actor uuid:=gen_random_uuid();member uuid:=gen_random_uuid();w uuid;t uuid;t2 uuid;a uuid;b uuid;c uuid;other_task uuid;begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values(actor,'authenticated','authenticated',actor::text||'@zulu-test.invalid','{}','{"display_name":"Kanban QA"}'),(member,'authenticated','authenticated',member::text||'@zulu-test.invalid','{}','{"display_name":"Read-only QA"}');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 set local role authenticated;
 w:=public.create_workspace('Kanban QA rollback');t:=public.create_team(w,'Board QA');t2:=public.create_team(w,'Other board QA');
 perform public.set_workspace_member(w,member,'member');perform public.set_team_member(t,member,'member');
 a:=public.save_task(t,'First');b:=public.save_task(t,'Second');c:=public.save_task(t,'Third');other_task:=public.save_task(t2,'Other team');
 perform public.position_task(c,'todo',1,a,null);
 if (select sort_order from public.tasks where id=c)>=(select sort_order from public.tasks where id=a) then raise exception 'Cannot reorder to the top';end if;
 perform public.position_task(c,'in_progress',2);
 if not exists(select 1 from public.tasks where id=c and status='in_progress' and version=3) then raise exception 'Column or version not saved';end if;
 perform public.position_task(a,'todo',1,null,b);
 if (select sort_order from public.tasks where id=a)<=(select sort_order from public.tasks where id=b) then raise exception 'Cannot reorder to the bottom';end if;
 begin perform public.position_task(a,'todo',1);raise exception 'Stale version accepted';exception when serialization_failure then null;end;
 begin perform public.position_task(a,'todo',2,other_task,null);raise exception 'Cross-team neighbor accepted';exception when serialization_failure then null;end;
 begin perform public.position_task(a,'todo',2,c,null);raise exception 'Other-column neighbor accepted';exception when serialization_failure then null;end;
 reset role;
 update public.team_members set permissions='{"tasks.view":true,"tasks.write":false}' where team_id=t and user_id=member;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated','aal','aal2')::text,true);
 set local role authenticated;
 begin perform public.position_task(b,'done',1);raise exception 'Read-only member changed task';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 begin perform public.position_task(b,'done',1);raise exception 'MFA not enforced';exception when insufficient_privilege then null;end;
 reset role;
 if has_function_privilege('anon','public.position_task(uuid,text,integer,uuid,uuid)','execute') then raise exception 'Anonymous execution granted';end if;
end;
$test$;
select 'kanban ordering, columns, versions, neighbor scope, permissions and MFA passed' as result;
