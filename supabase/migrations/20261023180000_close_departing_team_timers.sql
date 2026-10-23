begin;
-- A hidden or archived team must never leave a timer running without access.
do $$declare d text;begin
 select pg_get_functiondef('private.org_team_departure()'::regprocedure) into d;
 if position('if old.is_active and not new.is_active then' in d)=0 then raise exception 'Unexpected departure trigger';end if;
 d:=replace(d,'if old.is_active and not new.is_active then','if old.is_active and not new.is_active then perform private.org_close_timers(new.workspace_id,new.user_id,new.team_id);');execute d;
end$$;
commit;
