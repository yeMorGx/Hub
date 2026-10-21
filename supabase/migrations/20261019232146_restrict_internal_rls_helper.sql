-- O helper do Supabase é um event trigger, não uma RPC do aplicativo.
-- Preserva sua implementação, owner e ligação ao evento ensure_rls.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    if (select prorettype from pg_catalog.pg_proc where oid = 'public.rls_auto_enable()'::regprocedure)
      <> 'pg_catalog.event_trigger'::regtype then
      raise exception 'Tipo inesperado para public.rls_auto_enable()';
    end if;
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
