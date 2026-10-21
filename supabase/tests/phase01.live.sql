-- Executar como postgres em um Supabase de desenvolvimento já migrado.
-- As fixtures e alterações são revertidas em uma subtransação, inclusive no
-- caminho de sucesso. Nenhuma conta, mensagem ou hora de teste é retida.
-- JWTs simulados verificam as regras SQL; não substituem login/TOTP reais.
do $smoke$
declare
  admin_id uuid := gen_random_uuid();
  leader_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  outsider_id uuid := gen_random_uuid();
  workspace_a uuid; workspace_b uuid;
  team_a uuid; team_b uuid; team_c uuid;
  project_a uuid; project_b uuid;
  public_channel uuid; private_channel uuid; dm uuid;
  message_id uuid; retry_id uuid := gen_random_uuid();
  leader_entry uuid; member_entry uuid; timer uuid; test_event_id uuid;
  checks integer := 0;
  users_before bigint := (select count(*) from auth.users);
  data_before bigint := (select count(*) from public.workspaces);
begin
  begin
    insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
    values
      (admin_id,'authenticated','authenticated',admin_id::text||'@hub-smoke.invalid','{}','{"display_name":"Smoke admin"}'),
      (leader_id,'authenticated','authenticated',leader_id::text||'@hub-smoke.invalid','{}','{"display_name":"Smoke leader"}'),
      (member_id,'authenticated','authenticated',member_id::text||'@hub-smoke.invalid','{}','{"display_name":"Smoke member","role":"admin"}'),
      (outsider_id,'authenticated','authenticated',outsider_id::text||'@hub-smoke.invalid','{}','{"display_name":"Smoke outsider"}');

    perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','aal','aal2')::text,true);
    set local role authenticated;
    if current_user <> 'authenticated' then raise exception 'Role de teste não aplicada'; end if;
    workspace_a := public.create_workspace('Smoke A');
    team_a := public.create_team(workspace_a,'Smoke Red');
    team_b := public.create_team(workspace_a,'Smoke Blue');
    perform public.set_workspace_member(workspace_a,leader_id,'member');
    perform public.set_workspace_member(workspace_a,member_id,'member');
    perform public.set_team_member(team_a,leader_id,'leader');
    perform public.set_team_member(team_a,member_id,'member');
    perform public.set_team_member(team_b,member_id,'member');
    project_b := public.save_project(team_b,'Blue project');
    perform public.add_manual_time_entry(team_b,'2020-01-01T11:00Z','2020-01-01T12:00Z');
    perform public.add_manual_time_entry(team_a,'2020-01-01T13:00Z','2020-01-01T14:00Z');
    checks := checks+1;

    begin
      perform public.set_workspace_member(workspace_a,admin_id,'member');
      raise exception 'Último admin foi rebaixado';
    exception when check_violation then checks := checks+1;
    end;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',leader_id,'role','authenticated','aal','aal2')::text,true);
    project_a := public.save_project(team_a,'Red project');
    public_channel := public.create_channel(team_a,'smoke-general','public',array[member_id]);
    private_channel := public.create_channel(team_a,'smoke-private','private',array[member_id]);
    perform public.send_message(public_channel,gen_random_uuid(),'Smoke hello');
    perform public.send_message(private_channel,gen_random_uuid(),'Smoke private');
    leader_entry := public.add_manual_time_entry(team_a,'2020-01-01T08:00Z','2020-01-01T09:00Z',project_a);
    test_event_id := public.save_event(team_a,'Smoke meeting','2030-01-01T13:00Z','2030-01-01T14:00Z','meeting');
    perform public.invite_event_attendee(test_event_id,member_id);
    checks := checks+1;

    begin
      perform public.set_workspace_member(workspace_a,leader_id,'admin');
      raise exception 'Líder conseguiu promover admin';
    exception when insufficient_privilege then checks := checks+1;
    end;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','aal','aal2')::text,true);
    member_entry := public.add_manual_time_entry(team_a,'2020-01-01T08:00Z','2020-01-01T09:00Z',project_a);
    perform public.add_manual_time_entry(team_b,'2020-01-01T10:00Z','2020-01-01T11:00Z');
    if (select count(*) from public.time_entries) <> 2
      or exists(select 1 from public.time_entries where user_id <> member_id)
      then raise exception 'Membro leu horas de outro usuário'; end if;
    checks := checks+1;
    if (select duration_seconds from public.time_entries where id=member_entry) <> 3600
      then raise exception 'Duração incorreta'; end if;
    checks := checks+1;

    begin
      update public.workspace_members set role='admin' where user_id=member_id;
      raise exception 'Escrita direta permitiu elevar papel';
    exception when insufficient_privilege then checks := checks+1;
    end;
    begin
      perform public.edit_time_entry(leader_entry,'2020-01-01T08:00Z','2020-01-01T08:30Z');
      raise exception 'Membro editou hora de terceiro';
    exception when insufficient_privilege then checks := checks+1;
    end;
    begin
      perform public.add_manual_time_entry(team_b,'2020-01-01T08:30Z','2020-01-01T09:30Z');
      raise exception 'Sobreposição entre times foi aceita';
    exception when exclusion_violation then checks := checks+1;
    end;

    if (select unread_count from public.channel_unread_counts where channel_id=public_channel) <> 1
      then raise exception 'Contagem inicial de não lidas incorreta'; end if;
    checks := checks+1;
    message_id := public.send_message(public_channel,retry_id,'Smoke retry');
    if public.send_message(public_channel,retry_id,'Payload repetido') <> message_id
      or (select count(*) from public.messages where channel_id=public_channel) <> 2
      then raise exception 'Retry de mensagem duplicou o registro'; end if;
    checks := checks+1;
    perform public.mark_channel_read(public_channel,999);
    perform public.mark_channel_read(public_channel,0);
    if (select last_read_ordinal from public.channel_members where channel_id=public_channel and user_id=member_id) <> 2
      or (select unread_count from public.channel_unread_counts where channel_id=public_channel) <> 0
      then raise exception 'Cursor de leitura incorreto'; end if;
    checks := checks+1;
    dm := public.open_dm(team_a,leader_id);
    if (select count(*) from public.channel_members where channel_id=dm) <> 2 then raise exception 'DM não possui dois membros'; end if;
    checks := checks+1;

    if (select ea.response from public.event_attendees ea where ea.event_id=test_event_id and ea.user_id=member_id) <> 'pending'
      then raise exception 'Convite não começou pendente'; end if;
    perform public.respond_to_event(test_event_id,'accepted');
    if (select ea.response from public.event_attendees ea where ea.event_id=test_event_id and ea.user_id=member_id) <> 'accepted'
      then raise exception 'RSVP não atualizado'; end if;
    checks := checks+1;
    begin
      perform public.save_event(p_team_id=>team_a,p_title=>'Spoof',p_starts_at=>'2030-01-01T13:00Z',
        p_ends_at=>'2030-01-01T14:00Z',p_event_id=>test_event_id);
      raise exception 'Membro alterou evento de terceiro';
    exception when insufficient_privilege then checks := checks+1;
    end;

    perform set_config('realtime.topic','team:'||team_a::text||':presence',true);
    if not private.can_use_realtime_topic(realtime.topic()) then raise exception 'Presence autorizada foi negada'; end if;
    if not private.can_use_realtime_topic('channel:'||dm::text||':typing') then raise exception 'Typing de DM autorizado foi negado'; end if;
    checks := checks+1;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','aal','aal1')::text,true);
    if (select count(*) from public.profiles) <> 1 or exists(select 1 from public.workspaces)
      or exists(select 1 from public.messages) or exists(select 1 from public.time_entries)
      or private.can_use_realtime_topic(realtime.topic())
      then raise exception 'AAL1 liberou dados colaborativos'; end if;
    checks := checks+1;
    begin
      perform public.start_timer(team_a);
      raise exception 'AAL1 iniciou timer';
    exception when insufficient_privilege then checks := checks+1;
    end;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','aal','aal2')::text,true);
    timer := public.start_timer(team_a,project_a,'Smoke timer');
    if public.start_timer(team_a,project_a,'Smoke timer') <> timer then raise exception 'Timer duplicou no retry'; end if;
    checks := checks+1;
    begin
      perform public.start_timer(team_b);
      raise exception 'Segundo timer aberto foi aceito';
    exception when unique_violation then checks := checks+1;
    end;
    if not (select timer_running from public.member_statuses where team_id=team_a and user_id=member_id)
      then raise exception 'Projeção de timer não atualizada'; end if;
    perform public.stop_timer(timer);
    if public.stop_timer(timer) <> timer or (select ended_at from public.time_entries where id=timer) is null
      then raise exception 'Parada de timer falhou'; end if;
    checks := checks+1;
    timer := public.start_timer(team_a,project_a,'Smoke offboarding');

    perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider_id,'role','authenticated','aal','aal2')::text,true);
    workspace_b := public.create_workspace('Smoke B');
    team_c := public.create_team(workspace_b,'Smoke Other');
    perform public.add_manual_time_entry(team_c,'2020-01-01T08:00Z','2020-01-01T09:00Z');
    if exists(select 1 from public.workspaces where id=workspace_a) or exists(select 1 from public.events)
      or exists(select 1 from public.messages) or exists(select 1 from public.time_entries where team_id in (team_a,team_b))
      then raise exception 'Outra organização acessou dados'; end if;
    if private.can_use_realtime_topic('team:'||team_a::text||':presence')
      then raise exception 'Outra organização acessou Presence'; end if;
    checks := checks+1;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',leader_id,'role','authenticated','aal','aal2')::text,true);
    if exists(select 1 from public.time_entries where team_id<>team_a)
      or not exists(select 1 from public.time_entries where user_id=admin_id)
      then raise exception 'Escopo de horas do líder incorreto'; end if;
    if public.open_dm(team_a,member_id) <> dm then raise exception 'Par de DM não é canônico'; end if;
    checks := checks+1;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','aal','aal2')::text,true);
    if not exists(select 1 from public.time_entries where team_id=team_b and user_id=member_id)
      or exists(select 1 from public.time_entries where team_id=team_c)
      then raise exception 'Escopo de horas do admin incorreto'; end if;
    checks := checks+1;
    if exists(select 1 from public.messages where channel_id=private_channel)
      or exists(select 1 from public.channels where id=dm)
      then raise exception 'Admin acessou chat sem participação'; end if;
    checks := checks+1;
    perform public.set_team_member(team_a,member_id,'member',false);
    if (select ended_at from public.time_entries where id=timer) is null
      or (select timer_running from public.member_statuses where team_id=team_a and user_id=member_id)
      then raise exception 'Revogação não encerrou timer'; end if;
    checks := checks+1;

    perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','aal','aal2')::text,true);
    if exists(select 1 from public.messages where channel_id in (public_channel,private_channel,dm))
      or exists(select 1 from public.time_entries where team_id=team_a)
      or private.can_use_realtime_topic('team:'||team_a::text||':presence')
      then raise exception 'Revogação não bloqueou dados'; end if;
    checks := checks+1;

    reset role;
    begin
      insert into public.time_entries(team_id,user_id,project_id,source,started_at,ended_at)
      values (team_a,member_id,project_b,'manual','2020-01-02T08:00Z','2020-01-02T09:00Z');
      raise exception 'FK composta aceitou projeto de outro time';
    exception when foreign_key_violation then checks := checks+1;
    end;

    -- O código exclusivo abaixo é capturado apenas para reverter as fixtures.
    raise exception using errcode='PZ001',message='Reverter fixtures da validação concluída';
  exception when sqlstate 'PZ001' then
    null;
  end;
  if (select count(*) from auth.users) <> users_before or (select count(*) from public.workspaces) <> data_before
    then raise exception 'Fixtures não foram revertidas'; end if;
  perform set_config('hub.live_test_result',jsonb_build_object('passed',checks,'failed',0,
    'fixtures_rolled_back',true,'postgres_version',current_setting('server_version'))::text,true);
end;
$smoke$;
select current_setting('hub.live_test_result')::jsonb as validation;
