begin;
-- Management and share selectors list only real, unarchived teams.
do $$declare d text;begin
 select pg_get_functiondef('public.organization_console(uuid,text,jsonb)'::regprocedure) into d;
 if position('where workspace_id=w and(is_general or private.org_team_admin(id))' in d)=0 then raise exception 'Unexpected organization team query';end if;
 d:=replace(d,'where workspace_id=w and(is_general or private.org_team_admin(id))','where workspace_id=w and private.org_team_available(id) and(is_general or private.org_team_admin(id))');execute d;
 select pg_get_functiondef('public.library_console(uuid,text,jsonb)'::regprocedure) into d;
 if position('from public.teams where workspace_id=w)' in d)=0 then raise exception 'Unexpected library team query';end if;
 d:=replace(d,'from public.teams where workspace_id=w)','from public.teams where workspace_id=w and private.org_team_available(id))');execute d;
end$$;
commit;
