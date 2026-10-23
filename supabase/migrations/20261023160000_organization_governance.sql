begin;
alter table public.workspaces add column owner_id uuid references public.profiles(id);
update public.workspaces w set owner_id=coalesce((select m.user_id from public.workspace_members m where m.workspace_id=w.id and m.is_active and m.role='admin' order by (m.user_id=w.created_by) desc,m.joined_at,m.user_id limit 1),w.created_by);
alter table public.workspaces alter column owner_id set not null;
alter table public.workspace_members add column job_title text not null default '' check(char_length(job_title)<=100), add column can_approve boolean not null default false;
alter table public.team_members add column is_team_admin boolean not null default false, add column permissions jsonb not null default '{}' check(jsonb_typeof(permissions)='object');
update public.team_members set is_team_admin=(role='leader');
create function private.org_legacy_team_role() returns trigger language plpgsql set search_path='' as $$begin if tg_op='INSERT' and new.role='leader' then new.is_team_admin:=true;elsif tg_op='UPDATE' and new.role<>old.role then new.is_team_admin:=(new.role='leader');end if;return new;end$$;
create trigger org_legacy_team_role before insert or update on public.team_members for each row execute function private.org_legacy_team_role();
alter table private.team_invitations add column access_config jsonb;
create function private.assign_org_owner() returns trigger language plpgsql security definer set search_path='' as $$begin new.owner_id:=new.created_by;return new;end$$;
create trigger assign_org_owner before insert on public.workspaces for each row execute function private.assign_org_owner();
create function private.org_owner(w uuid,u uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select private.has_mfa() and exists(select 1 from public.workspaces where id=w and owner_id=u) and exists(select 1 from public.workspace_members where workspace_id=w and user_id=u and is_active)$$;
create function private.org_admin(w uuid,u uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select private.has_mfa() and exists(select 1 from public.workspace_members where workspace_id=w and user_id=u and is_active and role='admin')$$;
create function private.org_team_admin(t uuid,u uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select private.has_mfa() and exists(select 1 from public.team_members m join public.workspace_members w using(workspace_id,user_id) where m.team_id=t and m.user_id=u and m.is_active and w.is_active and m.is_team_admin)$$;
create function private.org_active(w uuid,u uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select private.has_mfa() and exists(select 1 from public.workspace_members where workspace_id=w and user_id=u and is_active)$$;
create table public.org_features(workspace_id uuid not null references public.workspaces(id),feature text not null,enabled boolean not null default true,primary key(workspace_id,feature));
create table public.org_approval_policies(workspace_id uuid not null references public.workspaces(id),action text not null,approvers uuid[] not null default '{}',required_approvers uuid[] not null default '{}',quorum integer not null default 1 check(quorum between 1 and 30),expires_days integer not null default 7 check(expires_days between 1 and 90),primary key(workspace_id,action));
create table public.org_requests(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),team_id uuid references public.teams(id),action text not null,payload jsonb not null,requested_by uuid not null references public.profiles(id),reason text not null check(char_length(reason) between 3 and 1000),status text not null default 'pending' check(status in('pending','executed','rejected','cancelled','expired','failed')),approvers uuid[] not null,required_approvers uuid[] not null,quorum integer not null,expires_at timestamptz not null,created_at timestamptz not null default clock_timestamp(),decided_at timestamptz,result_note text);
create table public.org_votes(request_id uuid not null references public.org_requests(id),user_id uuid not null references public.profiles(id),decision text not null check(decision in('approve','reject')),reason text not null default '' check(char_length(reason)<=1000),created_at timestamptz not null default clock_timestamp(),primary key(request_id,user_id));
create table public.org_transfers(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),from_user uuid not null references public.profiles(id),to_user uuid not null references public.profiles(id),leave_after boolean not null default false,status text not null default 'pending' check(status in('pending','accepted','rejected','cancelled','expired')),created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default clock_timestamp()+interval '7 days');
create unique index org_one_transfer on public.org_transfers(workspace_id) where status='pending';
create table public.org_notices(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),user_id uuid not null references public.profiles(id),message text not null,request_id uuid,read_at timestamptz,created_at timestamptz not null default clock_timestamp());
create table public.org_activity(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),actor_id uuid not null references public.profiles(id),action text not null,details jsonb not null default '{}',created_at timestamptz not null default clock_timestamp());
create index org_requests_pending on public.org_requests(workspace_id,status,created_at desc);
create index org_notices_user on public.org_notices(user_id,created_at desc);
create function private.org_feature(w uuid,f text) returns boolean language sql stable security definer set search_path='' as $$select coalesce((select enabled from public.org_features where workspace_id=w and feature=f),true)$$;
create function private.org_can(t uuid,cap text,u uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select private.has_mfa() and exists(select 1 from public.teams tt join public.workspace_members w on w.workspace_id=tt.workspace_id and w.user_id=u and w.is_active join public.team_members m on m.team_id=tt.id and m.user_id=u and m.is_active
 where tt.id=t and private.org_feature(tt.workspace_id,split_part(cap,'.',1)) and (private.org_owner(tt.workspace_id,u) or coalesce((m.permissions->>cap)::boolean,true)))
$$;
create or replace function private.can_access_team(p_team_id uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_team_participant(p_team_id)$$;
create or replace function private.can_manage_team(p_team_id uuid) returns boolean language sql stable security definer set search_path='' as $$select private.is_team_participant(p_team_id) and (private.org_team_admin(p_team_id) or exists(select 1 from public.teams where id=p_team_id and private.org_admin(workspace_id)))$$;
create function private.org_notify(w uuid,u uuid,msg text,r uuid default null) returns void language sql security definer set search_path='' as $$insert into public.org_notices(workspace_id,user_id,message,request_id) values(w,u,msg,r)$$;
create function private.org_log(w uuid,a text,d jsonb default '{}') returns void language sql security definer set search_path='' as $$insert into public.org_activity(workspace_id,actor_id,action,details) values(w,auth.uid(),a,d)$$;
-- Protect the owner even through legacy membership RPCs.
create function private.org_protect_owner() returns trigger language plpgsql security definer set search_path='' as $$begin
 if old.user_id=(select owner_id from public.workspaces where id=old.workspace_id) and (tg_op='DELETE' or not new.is_active or new.role<>'admin') then raise exception 'Transfira a coroa antes de alterar o dono.' using errcode='23514';end if;return new;end$$;
create trigger org_protect_owner before update or delete on public.workspace_members for each row execute function private.org_protect_owner();
-- Old direct critical paths remain available only to the owner; admins use requests.
do $$declare rec record;d text;begin
 for rec in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('set_workspace_member','set_team_member','manage_team_access') loop
 d:=pg_get_functiondef(rec.oid);d:=replace(d,'private.is_workspace_admin(', 'private.org_owner(');execute d;end loop;end$$;

-- Library resources are private, even from organizational admins.
create table public.library_nodes(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),team_id uuid references public.teams(id),parent_id uuid references public.library_nodes(id),kind text not null check(kind in('library','folder','document')),title text not null check(char_length(btrim(title)) between 1 and 160),body text not null default '' check(char_length(body)<=200000),object_path text,filename text,sensitive boolean not null default false,created_by uuid not null references public.profiles(id),responsible_id uuid not null references public.profiles(id),archived_at timestamptz,version integer not null default 1,created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp());
create table public.library_grants(id uuid primary key default gen_random_uuid(),node_id uuid not null references public.library_nodes(id),user_id uuid references public.profiles(id),team_id uuid references public.teams(id),whole_org boolean not null default false,permissions text[] not null check(permissions <@ array['read','write','download','share']),created_by uuid not null references public.profiles(id),created_at timestamptz not null default clock_timestamp(),check(num_nonnulls(user_id,team_id)+(case when whole_org then 1 else 0 end)=1));
create table public.library_share_requests(id uuid primary key default gen_random_uuid(),node_id uuid not null references public.library_nodes(id),requested_by uuid not null references public.profiles(id),recipient_user uuid references public.profiles(id),recipient_team uuid references public.teams(id),permissions text[] not null check(permissions <@ array['read','write','download','share']),status text not null default 'pending' check(status in('pending','approved','rejected','cancelled','expired')),created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default clock_timestamp()+interval '7 days',decided_by uuid references public.profiles(id),check(num_nonnulls(recipient_user,recipient_team)=1));
create index library_parent on public.library_nodes(workspace_id,parent_id);
create index library_grant_node on public.library_grants(node_id);
create function private.library_can(n uuid,cap text,u uuid default auth.uid(),depth integer default 0) returns boolean language plpgsql stable security definer set search_path='' as $$
declare item public.library_nodes; has_rules boolean;granted boolean;begin
 if depth>16 or not private.has_mfa() then return false;end if;
 select * into item from public.library_nodes where id=n and archived_at is null;
 if not found or not private.org_active(item.workspace_id,u) or not private.org_feature(item.workspace_id,'documents') then return false;end if;
 if item.team_id is not null and private.active_team_user(item.team_id,u) and not private.org_can(item.team_id,case when cap='write' then 'documents.write' else 'documents.view' end,u) then return false;end if; if item.created_by=u or item.responsible_id=u then return true;end if;
 select exists(select 1 from public.library_grants where node_id=n),exists(select 1 from public.library_grants g where g.node_id=n and cap=any(g.permissions) and(g.user_id=u or g.whole_org or (g.team_id is not null and private.active_team_user(g.team_id,u)))) into has_rules,granted;
 -- An explicit share opens this item only, never its parent or siblings.
 if has_rules then return granted;end if;
 if item.parent_id is not null then return private.library_can(item.parent_id,cap,u,depth+1);end if;
 return false;
end$$;
create function private.library_responsibility(w uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$declare d record;next_user uuid;begin
 for d in select * from public.library_nodes where workspace_id=w and responsible_id=u loop
 select m.user_id into next_user from public.team_members m join public.workspace_members wm using(workspace_id,user_id) where m.team_id=d.team_id and m.is_active and m.is_team_admin and wm.is_active and m.user_id<>u order by m.joined_at,m.user_id limit 1;
 if next_user is null then select wm.user_id into next_user from public.workspace_members wm join public.workspaces ww on ww.id=wm.workspace_id where wm.workspace_id=w and wm.is_active and wm.role='admin' and wm.user_id<>u order by (wm.user_id=ww.owner_id) desc,wm.joined_at,wm.user_id limit 1;end if;
 if next_user is not null then update public.library_nodes set responsible_id=next_user,version=version+1 where id=d.id;perform private.org_notify(w,next_user,'Você agora é responsável pelo documento: '||d.title);end if;
 end loop;end$$;
create function private.org_departure() returns trigger language plpgsql security definer set search_path='' as $$begin
 if old.is_active and not new.is_active then
 perform private.library_responsibility(new.workspace_id,new.user_id);
 update public.team_members set is_active=false where workspace_id=new.workspace_id and user_id=new.user_id;
 update public.time_entries set ended_at=greatest(clock_timestamp(),started_at+interval '1 microsecond') where user_id=new.user_id and ended_at is null and team_id in(select id from public.teams where workspace_id=new.workspace_id);
 end if;return new;end$$;
create trigger org_departure after update on public.workspace_members for each row execute function private.org_departure();

-- Validate payloads again both on submission and execution.
create function private.org_validate(w uuid,a text,p jsonb,actor uuid) returns uuid language plpgsql security definer set search_path='' as $$declare t uuid:=(p->>'team_id')::uuid;u uuid:=(p->>'user_id')::uuid;k text;v jsonb;begin
 if not private.org_admin(w,actor) and not private.org_team_admin(t,actor) then raise exception 'Acesso negado' using errcode='42501';end if;
 if t is not null and not exists(select 1 from public.teams where id=t and workspace_id=w) then raise exception 'Time inválido' using errcode='22023';end if;
 if not private.org_admin(w,actor) and a not in('member_permissions','team_member','team_admin','invite') then raise exception 'Acesso negado' using errcode='42501';end if;
 if a in('member_permissions','team_member','team_admin','workspace_admin','member_remove','member_suspend') then
 if not private.org_active(w,u) then raise exception 'Pessoa indisponível' using errcode='22023';end if;
 if u=(select owner_id from public.workspaces where id=w) and a<>'member_permissions' then raise exception 'O dono está protegido.' using errcode='23514';end if;
 end if;
 if a in('member_permissions','team_admin') and not exists(select 1 from public.team_members where team_id=t and user_id=u and is_active) then raise exception 'Pessoa fora do time' using errcode='22023';end if;
 if a='member_permissions' then
 if t is null or jsonb_typeof(p->'permissions')<>'object' or char_length(coalesce(p->>'job_title',''))>100 then raise exception 'Permissões inválidas' using errcode='22023';end if;
 for k,v in select * from jsonb_each(p->'permissions') loop
 if k !~ '^(tasks|projects|hours|calendar|chat|calls|documents|checkins|people|reports|integrations|management)\.(view|write|manage|download|share)$' or jsonb_typeof(v)<>'boolean' then raise exception 'Permissão inválida: %',k using errcode='22023';end if;
 if not private.org_admin(w,actor) and v='true'::jsonb and not private.org_can(t,k,actor) then raise exception 'Esta permissão está fora do seu alcance de delegação.' using errcode='42501';end if; end loop;
 if not private.org_admin(w,actor) and (u=actor or exists(select 1 from public.team_members where team_id=t and user_id=u and is_team_admin)) then raise exception 'Use a aprovação para alterar administradores.' using errcode='42501';end if;
 end if;
 if a='feature' and (not private.org_admin(w,actor) or p->>'feature' not in('tasks','projects','hours','calendar','chat','calls','documents','checkins','people','reports','integrations','management') or jsonb_typeof(p->'enabled')<>'boolean') then raise exception 'Função inválida' using errcode='22023';end if;
 if a='member_restore' and not exists(select 1 from public.workspace_members where workspace_id=w and user_id=u and not is_active) then raise exception 'Pessoa indisponível' using errcode='22023';end if; if a='team_delete' and not private.org_admin(w,actor) then raise exception 'Acesso negado' using errcode='42501';end if;
 if a not in('member_permissions','team_member','team_admin','workspace_admin','member_remove','member_suspend','feature','team_delete','invite','plan_change') then raise exception 'Ação inválida' using errcode='22023';end if;
 return t;
end$$;
create function private.org_apply(w uuid,a text,p jsonb,actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare t uuid;u uuid:=(p->>'user_id')::uuid;begin
 t:=private.org_validate(w,a,p,actor);
 if a='member_permissions' then update public.team_members set permissions=p->'permissions' where team_id=t and user_id=u;update public.workspace_members set job_title=coalesce(p->>'job_title',job_title) where workspace_id=w and user_id=u;
 elsif a='team_member' then insert into public.team_members(workspace_id,team_id,user_id,role,permissions) values(w,t,u,'member',coalesce(p->'permissions','{}')) on conflict(team_id,user_id) do update set is_active=true,permissions=excluded.permissions;insert into public.member_statuses(team_id,user_id) values(t,u) on conflict do nothing;
 elsif a='team_admin' then update public.team_members set is_team_admin=(p->>'enabled')::boolean where team_id=t and user_id=u;
 elsif a='workspace_admin' then update public.workspace_members set role=case when (p->>'enabled')::boolean then 'admin'::public.workspace_role else 'member'::public.workspace_role end where workspace_id=w and user_id=u;
 elsif a in('member_remove','member_suspend') then update public.workspace_members set is_active=false where workspace_id=w and user_id=u;
 elsif a='feature' then insert into public.org_features(workspace_id,feature,enabled) values(w,p->>'feature',(p->>'enabled')::boolean) on conflict(workspace_id,feature) do update set enabled=excluded.enabled;
 elsif a='team_delete' then update public.team_members set is_active=false where team_id=t;update public.channels set archived_at=clock_timestamp() where team_id=t;insert into public.org_features(workspace_id,feature,enabled) values(w,'archived-team:'||t,false) on conflict(workspace_id,feature) do nothing;
 elsif a='plan_change' then raise exception 'Alteração de plano ainda não integrada à cobrança.' using errcode='22023';
 elsif a='invite' then return private.org_make_invite(w,p,actor);
 end if;
 perform private.org_log(w,a,p);return jsonb_build_object('executed',true);
end$$;
create table private.org_invite_authorizations(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),config jsonb not null,issued_by uuid not null references public.profiles(id),expires_at timestamptz not null default clock_timestamp()+interval '7 days',invitation_id uuid references private.team_invitations(id));
create function private.org_make_invite(w uuid,p jsonb,actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare i uuid;t uuid;begin
 if coalesce(p->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(p->>'email')>254 or char_length(coalesce(p->>'job_title',''))>100 or jsonb_typeof(p->'teams')<>'array' or jsonb_array_length(p->'teams') not between 1 and 30 then raise exception 'Convite inválido' using errcode='22023';end if;
 for t in select (value->>'team_id')::uuid from jsonb_array_elements(p->'teams') loop
 if not exists(select 1 from public.teams where id=t and workspace_id=w) or (not private.org_admin(w,actor) and not private.org_team_admin(t,actor)) then raise exception 'Time fora do seu alcance' using errcode='42501';end if;
 end loop;
 insert into private.org_invite_authorizations(workspace_id,config,issued_by) values(w,p,actor) returning id into i;perform private.org_log(w,'invite_authorized',p-'email');return jsonb_build_object('authorization_id',i);
end$$;
create function private.org_request(w uuid,a text,p jsonb,why text,submit_owner boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();t uuid;pol public.org_approval_policies;r uuid;eligible uuid[];required_ids uuid[];v uuid;need integer;days integer;begin
 perform 1 from public.workspaces where id=w for update;
 t:=private.org_validate(w,a,p,actor);
 if a='invite' then
 if jsonb_typeof(p->'teams')<>'array' or jsonb_array_length(p->'teams')<1 then raise exception 'Convite inválido' using errcode='22023';end if;
 t:=(p->'teams'->0->>'team_id')::uuid;
 end if;
 if not submit_owner and (private.org_owner(w,actor) or a='member_permissions' or (a='invite' and coalesce((p->>'general_admin')::boolean,false)=false and jsonb_array_length(p->'teams')=1 and not coalesce((p->'teams'->0->>'is_team_admin')::boolean,false) and not exists(select 1 from jsonb_each(p->'teams'->0->'permissions') e where e.key like '%.manage' and e.value='true'::jsonb)
 and not exists(select 1 from auth.users au join public.team_members tm on tm.user_id=au.id where lower(au.email)=lower(p->>'email') and tm.workspace_id=w and tm.is_active and tm.team_id<>t))) then return private.org_apply(w,a,p,actor);end if;
 if char_length(btrim(coalesce(why,''))) not between 3 and 1000 then raise exception 'Informe o motivo da solicitação.' using errcode='22023';end if;
 select * into pol from public.org_approval_policies where workspace_id=w and action=a;
 eligible:=coalesce(pol.approvers,array[(select owner_id from public.workspaces where id=w)]); required_ids:=coalesce(pol.required_approvers,'{}');need:=coalesce(pol.quorum,1);days:=coalesce(pol.expires_days,7);
 eligible:=array(select distinct x from unnest(eligible) x where(x<>actor or(private.org_owner(w,actor) and submit_owner))and private.org_active(w,x) and (private.org_owner(w,x) or exists(select 1 from public.workspace_members where workspace_id=w and user_id=x and can_approve)));
 if cardinality(eligible)<need or not required_ids<@eligible then raise exception 'Não há aprovadores elegíveis suficientes. Peça ao dono para ajustar a política.' using errcode='22023';end if;
 insert into public.org_requests(workspace_id,team_id,action,payload,requested_by,reason,approvers,required_approvers,quorum,expires_at) values(w,t,a,p,actor,btrim(why),eligible,required_ids,need,clock_timestamp()+make_interval(days=>days)) returning id into r;
 foreach v in array eligible loop perform private.org_notify(w,v,'Nova solicitação: '||a,r);end loop;
 perform private.org_log(w,'request_created',jsonb_build_object('request_id',r,'action',a));return jsonb_build_object('request_id',r,'pending',true);
end$$;
create function private.org_decide(w uuid,rid uuid,decision text,why text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();r public.org_requests;result jsonb;votes uuid[];v uuid;begin
 perform 1 from public.workspaces where id=w for update;
 select * into r from public.org_requests where id=rid and workspace_id=w for update;
 if not found or not private.org_active(w) then raise exception 'Solicitação indisponível' using errcode='42501';end if;
 if r.status<>'pending' then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023';end if;
 if r.expires_at<=clock_timestamp() then update public.org_requests set status='expired',decided_at=clock_timestamp() where id=rid;return jsonb_build_object('expired',true);end if;
 if decision='cancel' then
 if actor<>r.requested_by and not private.org_owner(w) then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.org_requests set status='cancelled',decided_at=clock_timestamp() where id=rid;
 foreach v in array r.approvers loop perform private.org_notify(w,v,'Solicitação cancelada.',rid);end loop;return jsonb_build_object('cancelled',true);
 end if;
 if decision not in('approve','reject') or(actor=r.requested_by and not private.org_owner(w))or not actor=any(r.approvers) or not(private.org_owner(w) or exists(select 1 from public.workspace_members where workspace_id=w and user_id=actor and is_active and can_approve)) then raise exception 'Você não pode decidir esta solicitação.' using errcode='42501';end if;
 if decision='reject' and char_length(btrim(coalesce(why,'')))<3 then raise exception 'Informe a justificativa da rejeição.' using errcode='22023';end if;
 insert into public.org_votes(request_id,user_id,decision,reason) values(rid,actor,decision,left(coalesce(why,''),1000));
 if decision='reject' then update public.org_requests set status='rejected',decided_at=clock_timestamp() where id=rid;perform private.org_notify(w,r.requested_by,'Solicitação rejeitada.',rid);
 else
 select coalesce(array_agg(vv.user_id),'{}') into votes from public.org_votes vv join public.workspace_members m on m.user_id=vv.user_id and m.workspace_id=w and m.is_active join public.workspaces ww on ww.id=w where vv.request_id=rid and vv.decision='approve' and (m.can_approve or ww.owner_id=m.user_id);
 if cardinality(votes)>=r.quorum and r.required_approvers<@votes then
 begin
 result:=private.org_apply(w,r.action,r.payload,r.requested_by);
 update public.org_requests set status='executed',decided_at=clock_timestamp(),result_note=result::text where id=rid;
 perform private.org_notify(w,r.requested_by,'Solicitação aprovada e executada.',rid);
 exception when others then update public.org_requests set status='failed',decided_at=clock_timestamp(),result_note='As condições mudaram. Crie uma nova solicitação.' where id=rid;perform private.org_notify(w,r.requested_by,'Solicitação não executada: confira as condições atuais.',rid);end;
 end if;end if;
 perform private.org_log(w,'request_'||decision,jsonb_build_object('request_id',rid));return jsonb_build_object('decided',true);
end$$;

create function public.organization_console(p_workspace_id uuid,p_command text default 'state',p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=p_workspace_id;actor uuid:=private.require_mfa();p jsonb:=p_payload;t uuid;u uuid;r uuid;result jsonb;tr public.org_transfers;eligible uuid[];required_ids uuid[];n integer;k text;is_general boolean;begin
 if not private.org_active(w) then raise exception 'Acesso negado' using errcode='42501';end if;
 if octet_length(p::text)>100000 then raise exception 'Solicitação muito grande' using errcode='22023';end if;
 is_general:=private.org_admin(w);
 if p_command='capabilities' then
 return jsonb_build_object('owner',private.org_owner(w),'general_admin',is_general,'team_admin',exists(select 1 from public.team_members where workspace_id=w and user_id=actor and is_active and is_team_admin),'can_approve',exists(select 1 from public.workspace_members where workspace_id=w and user_id=actor and can_approve),
 'job_titles',coalesce((select jsonb_object_agg(user_id,job_title) from public.workspace_members where workspace_id=w and is_active),'{}'),
 'features',coalesce((select jsonb_object_agg(feature,enabled) from public.org_features where workspace_id=w),'{}'),
 'permissions',coalesce((select jsonb_object_agg(team_id,permissions) from public.team_members where workspace_id=w and user_id=actor and is_active),'{}'),
 'notices',coalesce((select jsonb_agg(to_jsonb(x)) from(select * from public.org_notices where workspace_id=w and user_id=actor order by created_at desc limit 50)x),'[]'),
 'transfers',coalesce((select jsonb_agg(to_jsonb(x)) from(select * from public.org_transfers where workspace_id=w and(to_user=actor or from_user=actor) and status='pending')x),'[]'));
 elsif p_command='notice_read' then update public.org_notices set read_at=clock_timestamp() where id=(p->>'id')::uuid and user_id=actor;return '{}';
 elsif p_command='request' then return private.org_request(w,p->>'action',p->'data',p->>'reason',coalesce((p->>'submit_for_approval')::boolean,false));
 elsif p_command='decide' then return private.org_decide(w,(p->>'id')::uuid,p->>'decision',p->>'reason');
 elsif p_command='policy' then
 if not private.org_owner(w) then raise exception 'Somente o dono pode definir políticas.' using errcode='42501';end if;
 eligible:=array(select distinct value::uuid from jsonb_array_elements_text(p->'approvers'));required_ids:=array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p->'required_approvers','[]')));n:=(p->>'quorum')::integer;
 if cardinality(eligible)<coalesce(n,0) or cardinality(eligible)=0 or not required_ids<@eligible then raise exception 'Política sem aprovadores suficientes.' using errcode='22023';end if;
 foreach u in array eligible loop if not private.org_active(w,u) or not(private.org_owner(w,u) or exists(select 1 from public.workspace_members where workspace_id=w and user_id=u and can_approve)) then raise exception 'Escolha aprovadores autorizados.' using errcode='22023';end if;end loop;
 if p->>'action' not in('workspace_admin','team_admin','team_member','member_remove','member_suspend','feature','team_delete','invite','plan_change') then raise exception 'Ação inválida' using errcode='22023';end if;
 insert into public.org_approval_policies(workspace_id,action,approvers,required_approvers,quorum,expires_days) values(w,p->>'action',eligible,required_ids,n,(p->>'expires_days')::integer) on conflict(workspace_id,action) do update set approvers=excluded.approvers,required_approvers=excluded.required_approvers,quorum=excluded.quorum,expires_days=excluded.expires_days;
 perform private.org_log(w,'policy_updated',p);return '{}';
 elsif p_command='approver' then
 if not private.org_owner(w) then raise exception 'Somente o dono autoriza aprovadores.' using errcode='42501';end if;
 update public.workspace_members set can_approve=(p->>'enabled')::boolean where workspace_id=w and user_id=(p->>'user_id')::uuid and is_active;perform private.org_log(w,'approver_updated',p);return '{}';
 elsif p_command='transfer' then
 perform 1 from public.workspaces where id=w for update;
 if not private.org_owner(w) or not private.org_active(w,(p->>'user_id')::uuid) or actor=(p->>'user_id')::uuid then raise exception 'Escolha um membro ativo para receber a coroa.' using errcode='42501';end if;
 update public.org_transfers set status='cancelled' where workspace_id=w and status='pending';
 insert into public.org_transfers(workspace_id,from_user,to_user,leave_after) values(w,actor,(p->>'user_id')::uuid,coalesce((p->>'leave_after')::boolean,false)) returning id into r;perform private.org_notify(w,(p->>'user_id')::uuid,'Você recebeu uma transferência de propriedade para aceitar.');perform private.org_log(w,'transfer_requested',jsonb_build_object('id',r));return jsonb_build_object('id',r);
 elsif p_command='transfer_decide' then
 perform 1 from public.workspaces where id=w for update;
 select * into tr from public.org_transfers where id=(p->>'id')::uuid and workspace_id=w and to_user=actor and status='pending' for update;
 if not found then raise exception 'Transferência indisponível' using errcode='42501';end if;
 if tr.expires_at<clock_timestamp() then update public.org_transfers set status='expired' where id=tr.id;return jsonb_build_object('expired',true);end if;
 if tr.from_user<>(select owner_id from public.workspaces where id=w) then raise exception 'A propriedade mudou.' using errcode='22023';end if;
 if not coalesce((p->>'accept')::boolean,false) then update public.org_transfers set status='rejected' where id=tr.id;return '{}';end if;
 update public.workspaces set owner_id=actor where id=w;update public.workspace_members set role='admin' where workspace_id=w and user_id=actor;
 if tr.leave_after then update public.workspace_members set is_active=false where workspace_id=w and user_id=tr.from_user;end if;
 update public.org_transfers set status='accepted' where id=tr.id;perform private.org_log(w,'transfer_accepted',jsonb_build_object('id',tr.id));return '{}';
 elsif p_command='leave' then
 if private.org_owner(w) then raise exception 'Transfira a coroa antes de sair.' using errcode='23514';end if;
 update public.workspace_members set is_active=false where workspace_id=w and user_id=actor;perform private.org_log(w,'member_left');return '{}';
 elsif p_command='create_team' then
 if not is_general then raise exception 'Acesso negado' using errcode='42501';end if;
 return jsonb_build_object('id',public.create_team(w,p->>'name'));
 elsif p_command='state' then
 if not is_general and not exists(select 1 from public.team_members where workspace_id=w and user_id=actor and is_team_admin and is_active) and not exists(select 1 from public.workspace_members where workspace_id=w and user_id=actor and can_approve) then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.org_requests set status='expired',decided_at=clock_timestamp() where workspace_id=w and status='pending' and expires_at<=clock_timestamp();
 return jsonb_build_object('workspace',(select jsonb_build_object('id',id,'name',name,'owner_id',owner_id) from public.workspaces where id=w),
 'members',coalesce((select jsonb_agg(to_jsonb(x)) from(select m.user_id,pf.display_name,m.role,m.job_title,m.is_active,m.can_approve from public.workspace_members m join public.profiles pf on pf.id=m.user_id where m.workspace_id=w and(is_general or m.user_id=actor or exists(select 1 from public.team_members mm where mm.user_id=m.user_id and mm.workspace_id=w and private.org_team_admin(mm.team_id))))x),'[]'),
 'teams',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,name from public.teams where workspace_id=w and(is_general or private.org_team_admin(id)))x),'[]'),
 'memberships',coalesce((select jsonb_agg(to_jsonb(x)) from(select user_id,team_id,is_active,is_team_admin,permissions from public.team_members where workspace_id=w and(is_general or private.org_team_admin(team_id)))x),'[]'),
 'policies',case when private.org_owner(w) then coalesce((select jsonb_agg(to_jsonb(q)) from public.org_approval_policies q where workspace_id=w),'[]') else '[]'::jsonb end,
 'requests',coalesce((select jsonb_agg(to_jsonb(x)) from(select * from public.org_requests q where workspace_id=w and(is_general or requested_by=actor or actor=any(approvers)) order by created_at desc limit 200)x),'[]'),
 'votes',coalesce((select jsonb_agg(to_jsonb(vv)) from public.org_votes vv join public.org_requests q on q.id=vv.request_id where q.workspace_id=w and(is_general or q.requested_by=actor or actor=any(q.approvers))),'[]'),
 'activity',case when is_general then coalesce((select jsonb_agg(to_jsonb(x)) from(select * from public.org_activity where workspace_id=w order by created_at desc limit 200)x),'[]') else '[]'::jsonb end,
 'invitations',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,email,expires_at,accepted_at,revoked_at,team_id,access_config from private.team_invitations where workspace_id=w and(is_general or private.org_team_admin(team_id)) order by created_at desc limit 100)x),'[]'),
 'invite_authorizations',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,config,expires_at,invitation_id from private.org_invite_authorizations where workspace_id=w and issued_by=actor and invitation_id is null and expires_at>clock_timestamp())x),'[]'));
 end if;
 raise exception 'Comando inválido' using errcode='22023';
end$$;
create function public.issue_organization_invite(p_authorization_id uuid,p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare actor uuid:=private.require_mfa();a private.org_invite_authorizations;i uuid;t uuid;begin
 select * into a from private.org_invite_authorizations where id=p_authorization_id for update;
 if not found or a.issued_by<>actor or a.invitation_id is not null or a.expires_at<=clock_timestamp() or not private.org_active(a.workspace_id) then raise exception 'Autorização indisponível' using errcode='42501';end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Token inválido' using errcode='22023';end if;
 t:=(a.config->'teams'->0->>'team_id')::uuid;
 perform private.org_validate(a.workspace_id,'invite',a.config,actor);
 if (select count(*) from private.team_invitations where workspace_id=a.workspace_id and created_at>clock_timestamp()-interval '1 hour')>=50 then raise exception 'Limite de convites por hora atingido.' using errcode='53300';end if;
 insert into private.team_invitations(workspace_id,team_id,email,role,token_hash,invited_by,access_config) values(a.workspace_id,t,lower(btrim(a.config->>'email')),'member',p_token_hash,actor,a.config) returning id into i;
 update private.org_invite_authorizations set invitation_id=i where id=a.id;
 return jsonb_build_object('id',i,'expires_at',(select expires_at from private.team_invitations where id=i));end$$;
create function private.org_accept_invite() returns trigger language plpgsql security definer set search_path='' as $$declare item jsonb;t uuid;begin
 if old.accepted_at is null and new.accepted_at is not null and new.access_config is not null then
 update public.workspace_members set job_title=coalesce(new.access_config->>'job_title',''),role=case when coalesce((new.access_config->>'general_admin')::boolean,false) then 'admin'::public.workspace_role else role end where workspace_id=new.workspace_id and user_id=new.accepted_by;
 for item in select value from jsonb_array_elements(new.access_config->'teams') loop
 t:=(item->>'team_id')::uuid;
 if not exists(select 1 from public.teams where id=t and workspace_id=new.workspace_id) then raise exception 'Time indisponível' using errcode='22023';end if;
 insert into public.team_members(workspace_id,team_id,user_id,role,is_team_admin,permissions) values(new.workspace_id,t,new.accepted_by,'member',coalesce((item->>'is_team_admin')::boolean,false),coalesce(item->'permissions','{}')) on conflict(team_id,user_id) do update set is_team_admin=excluded.is_team_admin,permissions=excluded.permissions;
 insert into public.member_statuses(team_id,user_id) values(t,new.accepted_by) on conflict do nothing;
 end loop;end if;return new;end$$;
create trigger org_accept_invite after update on private.team_invitations for each row execute function private.org_accept_invite();
-- Legacy invites retain their token format but may not silently grant administration.
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_team_invitation';
 d:=replace(d,'begin','begin'||E'\n if not exists(select 1 from public.teams t where t.id=p_team_id and private.org_owner(t.workspace_id)) then raise exception ''Use a central de aprovações.'' using errcode=''42501'';end if;');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='preview_team_invitation';
 d:=replace(d,'wm.role=''admin'' and wm.is_active','wm.is_active and (wm.role=''admin'' or private.org_team_admin(i.team_id,i.invited_by))');execute d;
end$$;

create function public.library_console(p_workspace_id uuid,p_command text default 'list',p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare w uuid:=p_workspace_id;actor uuid:=private.require_mfa();p jsonb:=p_payload;n uuid:=(p_payload->>'id')::uuid;item public.library_nodes;parent public.library_nodes;req public.library_share_requests;u uuid;t uuid;perms text[];rid uuid;idx integer;begin
 if not private.org_active(w) or not private.org_feature(w,'documents') then raise exception 'Biblioteca indisponível' using errcode='42501';end if;
 if octet_length(p::text)>250000 then raise exception 'Documento muito grande' using errcode='22023';end if;
 if p_command='list' then return jsonb_build_object('nodes',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,parent_id,team_id,kind,title,sensitive,created_by,responsible_id,version,updated_at,filename,
 private.library_can(id,'write') as can_write,private.library_can(id,'download') as can_download,private.library_can(id,'share') as can_share from public.library_nodes where workspace_id=w and private.library_can(id,'read') order by kind,title limit 500)x),'[]'),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',pf.id,'name',pf.display_name)) from public.workspace_members m join public.profiles pf on pf.id=m.user_id where m.workspace_id=w and m.is_active),'[]'),
 'teams',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.teams where workspace_id=w),'[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(q)) from public.library_share_requests q join public.library_nodes d on d.id=q.node_id where d.workspace_id=w and(q.requested_by=actor or d.responsible_id=actor) and q.status='pending' and q.expires_at>clock_timestamp()),'[]'));
 end if;
 select * into item from public.library_nodes where id=n and workspace_id=w and archived_at is null for update;
 if p_command='create' then
 t:=(p->>'team_id')::uuid;
 if p->>'kind' not in('library','folder','document') then raise exception 'Tipo inválido' using errcode='22023';end if;
 if p->>'parent_id' is not null then
 select * into parent from public.library_nodes where id=(p->>'parent_id')::uuid and workspace_id=w;
 if not found or parent.kind='document' or not private.library_can(parent.id,'write') then raise exception 'Sem permissão nesta pasta.' using errcode='42501';end if;t:=parent.team_id;
 elsif p->>'kind'<>'library' or not(private.org_admin(w) or private.org_team_admin(t)) then raise exception 'Escolha uma biblioteca ou pasta autorizada.' using errcode='42501';end if;
 if parent.id is null and t is not null and not exists(select 1 from public.teams where id=t and workspace_id=w and private.org_can(id,'documents.write')) then raise exception 'Time indisponível' using errcode='42501';end if;
 insert into public.library_nodes(workspace_id,team_id,parent_id,kind,title,body,sensitive,created_by,responsible_id) values(w,t,(p->>'parent_id')::uuid,p->>'kind',btrim(p->>'title'),coalesce(p->>'body',''),coalesce((p->>'sensitive')::boolean,false),actor,actor) returning id into n;
 perform private.org_log(w,'library_created',jsonb_build_object('id',n));return jsonb_build_object('id',n);
 end if;
 if item.id is null or not private.library_can(n,'read') then raise exception 'Você não tem acesso.' using errcode='42501';end if;
 if p_command='read' then return to_jsonb(item);
 elsif p_command='save' then
 if not private.library_can(n,'write') then raise exception 'Sem permissão para editar.' using errcode='42501';end if;
 if p->>'version' is null or item.version<>(p->>'version')::integer then raise exception 'Documento alterado por outra pessoa. Reabra antes de salvar.' using errcode='40001';end if;
 update public.library_nodes set title=btrim(p->>'title'),body=coalesce(p->>'body',''),version=version+1,updated_at=clock_timestamp() where id=n;perform private.org_log(w,'library_saved',jsonb_build_object('id',n));return '{}';
 elsif p_command='sensitivity' then
 if actor not in(item.created_by,item.responsible_id) or (not (p->>'sensitive')::boolean and actor<>item.responsible_id) then raise exception 'Somente o responsável pode retirar a proteção.' using errcode='42501';end if;
 if (p->>'sensitive')::boolean and not item.sensitive then
 -- Freeze inherited readers as individual grants before disabling inheritance.
 for u in select user_id from public.workspace_members where workspace_id=w and is_active loop
 perms:='{}';foreach idx in array array[1,2,3,4] loop
 if private.library_can(n,(array['read','write','download','share'])[idx],u) then perms:=array_append(perms,(array['read','write','download','share'])[idx]);end if;end loop;
 if cardinality(perms)>0 then insert into public.library_grants(node_id,user_id,permissions,created_by) values(n,u,perms,actor);end if;
 end loop;
 end if;
 update public.library_nodes set sensitive=(p->>'sensitive')::boolean,version=version+1 where id=n;perform private.org_log(w,'library_sensitivity',jsonb_build_object('id',n,'sensitive',p->'sensitive'));return '{}';
 elsif p_command in('share','request_share') then
 u:=(p->>'user_id')::uuid;t:=(p->>'team_id')::uuid;perms:=array(select distinct value from jsonb_array_elements_text(p->'permissions'));
 if num_nonnulls(u,t)<>1 or not 'read'=any(perms) or not perms<@array['read','write','download','share'] or(u is not null and not private.org_active(w,u)) or(t is not null and not exists(select 1 from public.teams where id=t and workspace_id=w)) then raise exception 'Destinatário ou acesso inválido' using errcode='22023';end if;
 if p_command='share' and not item.sensitive and private.library_can(n,'share') and not exists(select 1 from unnest(perms) permission where not private.library_can(n,permission)) then
 insert into public.library_grants(node_id,user_id,team_id,permissions,created_by) values(n,u,t,perms,actor);
 perform private.org_log(w,'document_shared',jsonb_build_object('id',n,'user_id',u,'team_id',t,'permissions',perms));return jsonb_build_object('shared',true);
 end if;
 if item.responsible_id=actor then
 -- Responsible confirms a separate approval for sensitive material as well.
 insert into public.library_share_requests(node_id,requested_by,recipient_user,recipient_team,permissions) values(n,actor,u,t,perms) returning id into rid;
 else
 insert into public.library_share_requests(node_id,requested_by,recipient_user,recipient_team,permissions) values(n,actor,u,t,perms) returning id into rid;
 perform private.org_notify(w,item.responsible_id,'Solicitação de compartilhamento: '||item.title);
 end if;return jsonb_build_object('request_id',rid,'pending',true);
 elsif p_command='share_decide' then
 select * into req from public.library_share_requests where id=(p->>'request_id')::uuid and node_id=n and status='pending' for update;
 if not found or actor<>item.responsible_id then raise exception 'Somente o responsável decide.' using errcode='42501';end if;
 if req.expires_at<=clock_timestamp() then update public.library_share_requests set status='expired' where id=req.id;return jsonb_build_object('expired',true);end if;
 if (p->>'approve')::boolean then
 if req.recipient_user is not null and not private.org_active(w,req.recipient_user) then raise exception 'Pessoa indisponível' using errcode='22023';end if;
 insert into public.library_grants(node_id,user_id,team_id,permissions,created_by) values(n,req.recipient_user,req.recipient_team,req.permissions,actor);end if;
 update public.library_share_requests set status=case when(p->>'approve')::boolean then 'approved' else 'rejected' end,decided_by=actor where id=req.id;
 perform private.org_log(w,'share_decided',jsonb_build_object('id',n,'request_id',req.id,'approve',p->'approve'));return '{}';
 elsif p_command='publish_org' then
 if actor<>item.responsible_id or item.kind<>'library' or item.sensitive then raise exception 'Somente o responsável pode liberar uma biblioteca não sensível.' using errcode='42501';end if;
 perms:=array(select distinct value from jsonb_array_elements_text(p->'permissions'));
 if not 'read'=any(perms) or not perms<@array['read','write','download','share'] then raise exception 'Permissões inválidas' using errcode='22023';end if;
 insert into public.library_grants(node_id,whole_org,permissions,created_by) values(n,true,perms,actor);perform private.org_log(w,'library_published',jsonb_build_object('id',n));return '{}';
 elsif p_command='grants' then
 if actor<>item.responsible_id and actor<>item.created_by then raise exception 'Acesso negado' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(g)) from public.library_grants g where node_id=n),'[]');
 elsif p_command='revoke' then
 if actor<>item.responsible_id and actor<>item.created_by then raise exception 'Acesso negado' using errcode='42501';end if;
 delete from public.library_grants where id=(p->>'grant_id')::uuid and node_id=n;perform private.org_log(w,'share_revoked',jsonb_build_object('id',n,'grant_id',p->'grant_id'));return '{}';
 elsif p_command='file' then
 if not private.library_can(n,'write') or p->>'path' not like n::text||'/%' or char_length(p->>'filename')>200 then raise exception 'Arquivo inválido' using errcode='42501';end if;
 if p->>'version' is null or item.version<>(p->>'version')::integer then raise exception 'Documento alterado. Reabra antes de anexar.' using errcode='40001';end if; update public.library_nodes set object_path=p->>'path',filename=p->>'filename',version=version+1 where id=n;return '{}';
 elsif p_command='download' then
 if not private.library_can(n,'download') then raise exception 'Sem permissão para baixar.' using errcode='42501';end if;return jsonb_build_object('path',item.object_path,'filename',item.filename,'title',item.title,'body',item.body);
 end if;raise exception 'Comando inválido' using errcode='22023';end$$;
-- Sensitive resources never gain readers through later changes to a parent's ACL.
do $$declare d text;begin select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='library_can';d:=replace(d,'if item.parent_id is not null then','if item.sensitive then return false;end if; if item.parent_id is not null then');execute d;end$$;

create function public.organization_permission(p_team_id uuid,p_capability text) returns boolean language sql stable security definer set search_path='' as $$select private.org_can(p_team_id,p_capability)$$;
-- Every new table is RLS-protected; all writes go through the checked RPCs.
do $$declare tbl text;begin foreach tbl in array array['org_features','org_approval_policies','org_requests','org_votes','org_transfers','org_notices','org_activity','library_nodes','library_grants','library_share_requests'] loop
 execute format('alter table public.%I enable row level security',tbl);execute format('revoke all on public.%I from anon,authenticated',tbl);
 end loop;end$$;
grant select on public.library_nodes to authenticated;
create policy library_read on public.library_nodes for select to authenticated using(private.library_can(id,'read'));
insert into storage.buckets(id,name,public,file_size_limit) values('organization-library','organization-library',false,52428800);
create function private.library_file(path text,cap text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.library_nodes d where d.id::text=split_part(path,'/',1) and private.library_can(d.id,cap))$$;
create policy library_file_read on storage.objects for select to authenticated using(bucket_id='organization-library' and private.library_file(name,'download'));
create policy library_file_insert on storage.objects for insert to authenticated with check(bucket_id='organization-library' and private.library_file(name,'write'));
create policy library_file_delete on storage.objects for delete to authenticated using(bucket_id='organization-library' and private.library_file(name,'write'));
-- Privileges are explicit: helpers and internal executors are not callable by clients.
do $$declare rec record;begin for rec in select p.proname,pg_get_function_identity_arguments(p.oid) args,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='private' and(p.proname like 'org_%' or p.proname like 'library_%' or p.proname='assign_org_owner')) or(n.nspname='public' and p.proname in('organization_console','library_console','organization_permission','issue_organization_invite')) loop
 execute format('revoke all on function %I.%I(%s) from public,anon,authenticated',rec.nspname,rec.proname,rec.args);
 if rec.nspname='public' or rec.proname in('library_can','library_file') then execute format('grant execute on function %I.%I(%s) to authenticated',rec.nspname,rec.proname,rec.args);end if;
 end loop;end$$;
-- Restrictive read policies combine with the existing row ownership policies.
do $$declare pair text[];tbl text;cap text;begin
 foreach pair slice 1 in array array[['tasks','tasks.view'],['projects','projects.view'],['time_entries','hours.view'],['paused_timers','hours.view'],['work_schedules','hours.view'],['events','calendar.view'],['event_attendees','calendar.view'],['home_office_schedules','calendar.view'],['home_office_assignments','calendar.view'],['team_dates','calendar.view'],['team_notes','documents.view'],['meeting_documents','documents.view'],['standups','checkins.view'],['clients','management.view'],['shifts','management.view'],['absences','management.view'],['time_goals','hours.view']] loop
 tbl:=pair[1];cap:=pair[2];
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name=tbl and column_name='team_id') then execute format('create policy org_module_read on public.%I as restrictive for select to authenticated using(private.org_can(team_id,%L))',tbl,cap);end if;
 end loop;end$$;
-- Existing RPCs must honor the same permissions as direct reads.
do $$declare rec record;d text;cap text;guard text;team_expression text;begin
 for rec in select p.oid,p.proname,p.proargnames,l.lanname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and l.lanname='plpgsql' loop
 cap:=null;team_expression:=null;
 if rec.proname in('save_task','move_task','archive_task','start_task_timer') then cap:='tasks.write';
 elsif rec.proname in('save_project') then cap:='projects.write';
 elsif rec.proname in('start_timer','add_manual_time_entry','edit_time_entry','resume_timer','save_work_schedule') then cap:='hours.write';
 elsif rec.proname in('report_time_entries','report_work_balances') then cap:='reports.view'; elsif rec.proname='get_work_hour_balance' then cap:='hours.view';
 elsif rec.proname in('save_event','cancel_event','invite_event_attendee','respond_to_event','save_home_office_schedule','request_home_office_swap','decide_home_office_swap') then cap:='calendar.write';
 elsif rec.proname in('get_home_office_calendar','get_home_office_schedule') then cap:='calendar.view';
 elsif rec.proname in('create_channel','join_public_channel','set_channel_member','remove_channel_member','recover_channel_moderator','set_channel_archived','open_dm','send_message','edit_message','delete_message','send_rich_message','react_to_message','pin_message','reserve_attachment','finish_attachment','remove_attachment') then cap:='chat.write';
 elsif rec.proname in('search_channel_messages') then cap:='chat.view';
 elsif rec.proname in('call_channel_roster') then cap:='calls.view';
 elsif rec.proname in('save_team_note','save_meeting_documents') then cap:='documents.write';
 elsif rec.proname in('save_standup') then cap:='checkins.write';
 elsif rec.proname in('save_client','save_shift','request_shift_swap','decide_shift_swap','request_absence','decide_absence','cancel_absence','save_team_date','save_time_goal') then cap:='management.write';
 end if;
 if cap is null then continue;end if;
 if 'p_team_id'=any(rec.proargnames) then team_expression:='p_team_id';
 elsif 'p_task_id'=any(rec.proargnames) then team_expression:='(select team_id from public.tasks where id=p_task_id)';
 elsif 'p_channel_id'=any(rec.proargnames) then team_expression:='(select team_id from public.channels where id=p_channel_id)';
 elsif 'p_message_id'=any(rec.proargnames) then team_expression:='(select team_id from public.messages where id=p_message_id)';
 elsif 'p_entry_id'=any(rec.proargnames) then team_expression:='(select team_id from public.time_entries where id=p_entry_id)';
 elsif 'p_event_id'=any(rec.proargnames) then team_expression:='(select team_id from public.events where id=p_event_id)';
 elsif 'p_attachment_id'=any(rec.proargnames) then team_expression:='(select team_id from public.attachments where id=p_attachment_id)';
 elsif 'p_absence_id'=any(rec.proargnames) then team_expression:='(select team_id from public.absences where id=p_absence_id)';
 elsif 'p_shift_id'=any(rec.proargnames) then team_expression:='(select team_id from public.shifts where id=p_shift_id)';
 end if;
 if team_expression is null then continue;end if;
 guard:=format(' if not private.org_can(%s,%L) then raise exception ''Esta função está indisponível para seu acesso.'' using errcode=''42501'';end if; ',team_expression,cap);
 d:=pg_get_functiondef(rec.oid);d:=regexp_replace(d,'\mBEGIN\M','BEGIN'||guard,'i');execute d;
 end loop;end$$;
-- Membership stays separate from channel participation; no admin DM override.
create or replace function private.can_access_channel(p_channel_id uuid) returns boolean language sql stable security definer set search_path='' as $$select private.has_mfa() and exists(select 1 from public.channel_members cm where cm.channel_id=p_channel_id and cm.user_id=auth.uid() and private.org_can(cm.team_id,'chat.view'))$$;
grant execute on function private.org_can(uuid,text,uuid) to authenticated;

alter table public.teams add column is_organization_space boolean not null default false;
create unique index org_communication_space on public.teams(workspace_id) where is_organization_space;
create policy hide_org_space on public.teams as restrictive for select to authenticated using(not is_organization_space);
create function public.organization_contacts(p_workspace_id uuid,p_other_user_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare actor uuid:=private.require_mfa();space uuid;channel uuid;u uuid;perms jsonb;begin
 if not private.org_active(p_workspace_id) or not private.org_feature(p_workspace_id,'chat') then raise exception 'Conversas indisponíveis' using errcode='42501';end if;
 if p_other_user_id is not null then
 if p_other_user_id=actor or not private.org_active(p_workspace_id,p_other_user_id) then raise exception 'Contato indisponível' using errcode='42501';end if;
 perform 1 from public.workspaces where id=p_workspace_id for update;
 select id into space from public.teams where workspace_id=p_workspace_id and is_organization_space;
 if space is null then insert into public.teams(workspace_id,name,created_by,is_organization_space) values(p_workspace_id,'Conversas da organização',actor,true) returning id into space;end if;
 perms:='{"chat.view":true,"chat.write":true,"calls.view":true,"calls.write":true,"tasks.view":false,"tasks.write":false,"hours.view":false,"hours.write":false,"calendar.view":false,"calendar.write":false,"documents.view":false,"documents.write":false,"projects.view":false,"projects.write":false,"reports.view":false,"reports.write":false,"people.view":false,"management.view":false,"management.write":false,"checkins.view":false,"checkins.write":false,"integrations.view":false,"integrations.write":false}';
 foreach u in array array[actor,p_other_user_id] loop insert into public.team_members(workspace_id,team_id,user_id,role,permissions) values(p_workspace_id,space,u,'member',perms) on conflict(team_id,user_id) do update set is_active=true,permissions=excluded.permissions;end loop;
 channel:=public.open_dm(space,p_other_user_id);return jsonb_build_object('channel_id',channel,'team_id',space);
 end if;
 return jsonb_build_object('people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'job_title',m.job_title)) from public.workspace_members m join public.profiles p on p.id=m.user_id where m.workspace_id=p_workspace_id and m.is_active),'[]'),
 'channels',coalesce((select jsonb_agg(to_jsonb(c)) from public.channels c join public.teams t on t.id=c.team_id where t.workspace_id=p_workspace_id and t.is_organization_space and private.can_access_channel(c.id)),'[]'));
 end$$;
revoke all on function public.organization_contacts(uuid,uuid) from public,anon;grant execute on function public.organization_contacts(uuid,uuid) to authenticated;

-- Explicit capabilities never turn a hidden communication space into another team.
create or replace function private.org_can(t uuid,cap text,u uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select cap ~ '^(tasks|projects|hours|calendar|chat|calls|documents|checkins|people|reports|integrations|management)\.(view|write|manage|download|share)$'
 and private.has_mfa() and exists(select 1 from public.teams tt join public.workspace_members w on w.workspace_id=tt.workspace_id and w.user_id=u and w.is_active join public.team_members m on m.team_id=tt.id and m.user_id=u and m.is_active
 where tt.id=t and private.org_feature(tt.workspace_id,split_part(cap,'.',1)) and private.org_feature(tt.workspace_id,'archived-team:'||t)
 and (not tt.is_organization_space or (split_part(cap,'.',1) in('chat','calls') and exists(select 1 from public.team_members original join public.teams regular on regular.id=original.team_id where original.user_id=u and original.workspace_id=tt.workspace_id and original.is_active and not regular.is_organization_space and coalesce((original.permissions->>cap)::boolean,true))))
 and (private.org_owner(tt.workspace_id,u) or (
 coalesce((m.permissions->>cap)::boolean,case when cap='reports.manage' then w.role='admin' when split_part(cap,'.',2)='manage' then (m.is_team_admin or w.role='admin') when cap='projects.write' then (m.is_team_admin or w.role='admin') else true end)
 and (split_part(cap,'.',2)='view' or coalesce((m.permissions->>(split_part(cap,'.',1)||'.view'))::boolean,true)))))
$$;
-- Only owners keep access to legacy invitation creation; everyone else uses approved configuration.
-- Safe delegation: requests that grant management capabilities are critical.
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_request';
 d:=replace(d,'or a=''member_permissions'' or', 'or (a=''member_permissions'' and not exists(select 1 from jsonb_each(p->''permissions'') e where e.key like ''%.manage'' and e.value=''true''::jsonb) and not exists(select 1 from public.workspace_members where workspace_id=w and user_id=(p->>''user_id'')::uuid and role=''admin'') and not exists(select 1 from public.team_members where team_id=t and user_id=(p->>''user_id'')::uuid and is_team_admin)) or');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='organization_console';d:=replace(d,'(''workspace_admin'',''team_admin'',''team_member''','(''member_permissions'',''workspace_admin'',''team_admin'',''team_member''');execute d;
end$$;
-- A module's management permission applies only to that module's RPCs, never to organization authority.
do $$declare rec record;d text;cap text;begin
 for rec in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%private.can_manage_team(%' loop
 cap:=case when rec.proname in('save_task','move_task','archive_task') then 'tasks.manage' when rec.proname in('save_project','save_client') then 'projects.manage' when rec.proname like '%time%' or rec.proname like '%work_schedule%' then 'hours.manage' when rec.proname like '%event%' or rec.proname like '%home_office%' then 'calendar.manage' when rec.proname like '%note%' then 'documents.manage' when rec.proname like '%absence%' or rec.proname like '%shift%' or rec.proname like '%date%' then 'management.manage' else null end;
 if cap is not null then d:=pg_get_functiondef(rec.oid);d:=regexp_replace(d,'private.can_manage_team\(([^()]+)\)',format('(private.can_manage_team(\1) or private.org_can(\1,%L))',cap),'g');execute d;end if;
 end loop;end$$;
-- Projects can be authored by people explicitly allowed to use/edit that module.
do $$declare d text;begin select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_project';d:=replace(d,'(private.can_manage_team(p_team_id) or private.org_can(p_team_id,''projects.manage''))','private.org_can(p_team_id,''projects.write'')');execute d;end$$;
-- Invalid invitation payloads never become approved access.
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_validate';
 d:=replace(d,'if a=''member_permissions'' then', 'if a=''invite'' then if jsonb_typeof(p->''teams'') is distinct from ''array'' or jsonb_array_length(p->''teams'') not between 1 and 30 then raise exception ''Convite inválido'' using errcode=''22023'';end if; for v in select value from jsonb_array_elements(p->''teams'') loop if not exists(select 1 from public.teams where id=(v->>''team_id'')::uuid and workspace_id=w and not is_organization_space) or (not private.org_admin(w,actor) and not private.org_team_admin((v->>''team_id'')::uuid,actor)) then raise exception ''Acesso negado'' using errcode=''42501'';end if; if jsonb_typeof(v->''permissions'') is distinct from ''object'' then raise exception ''Permissões inválidas'' using errcode=''22023'';end if; for k in select key from jsonb_each(v->''permissions'') e where e.key !~ ''^(tasks|projects|hours|calendar|chat|calls|documents|checkins|people|reports|integrations|management)\.(view|write|manage|download|share)$'' or jsonb_typeof(e.value)<>''boolean'' loop raise exception ''Permissão inválida'' using errcode=''22023'';end loop;end loop;end if; if a=''member_permissions'' then');
 execute d;
end$$;

-- Access revocation also releases paused timers; one tenant cannot strand a user's timer in another.
create function private.org_team_departure() returns trigger language plpgsql security definer set search_path='' as $$declare d record;next_user uuid;begin
 if old.is_active and not new.is_active then
 delete from public.paused_timers where team_id=new.team_id and user_id=new.user_id;
 for d in select * from public.library_nodes where team_id=new.team_id and responsible_id=new.user_id loop
 select m.user_id into next_user from public.team_members m join public.workspace_members wm using(workspace_id,user_id) where m.team_id=new.team_id and m.is_active and m.is_team_admin and wm.is_active and m.user_id<>new.user_id order by m.joined_at,m.user_id limit 1;
 if next_user is null then select m.user_id into next_user from public.workspace_members m join public.workspaces ww on ww.id=m.workspace_id where m.workspace_id=new.workspace_id and m.is_active and m.role='admin' and m.user_id<>new.user_id order by(m.user_id=ww.owner_id)desc,m.joined_at,m.user_id limit 1;end if;
 if next_user is not null then update public.library_nodes set responsible_id=next_user,version=version+1 where id=d.id;perform private.org_notify(new.workspace_id,next_user,'Você agora é responsável pelo documento: '||d.title);end if;
 end loop;end if;return new;end$$;
create trigger org_team_departure after update on public.team_members for each row execute function private.org_team_departure();
-- Membership restore does not restore old team memberships; each inclusion is explicit.
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_validate';
 d:=replace(d,'if u=(select owner_id from public.workspaces where id=w) and a<>''member_permissions'' then','if u=(select owner_id from public.workspaces where id=w) and a in(''workspace_admin'',''member_remove'',''member_suspend'') then');
 d:=replace(d,'''member_remove'',''member_suspend'',''feature''','''member_remove'',''member_suspend'',''member_restore'',''feature''');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_apply';
 d:=replace(d,'elsif a in(''member_remove'',''member_suspend'') then','elsif a=''member_restore'' then update public.workspace_members set is_active=true where workspace_id=w and user_id=u; elsif a in(''member_remove'',''member_suspend'') then');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='organization_console';
 d:=replace(d,'''member_remove'',''member_suspend'',''feature''','''member_remove'',''member_suspend'',''member_restore'',''feature''');execute d;
end$$;
-- Delegate only the relevant module's administrative actions, not other modules.
do $$declare rec record;d text;begin
 for rec in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%private.can_manage_team(%' loop
 d:=pg_get_functiondef(rec.oid);d:=regexp_replace(d,'\(private.can_manage_team\(([^()]+)\) or private.org_can\(\1,''([a-z]+\.manage)''\)\)','private.org_can(\1,''\2'')','g');execute d;end loop;end$$;
create or replace function private.can_export_team(p_team_id uuid) returns boolean language sql stable security definer set search_path='' as $$select private.org_can(p_team_id,'reports.manage')$$;
-- Integration entry points must honor organization-wide switches, including workers/webhooks.
do $$declare rec record;d text;team_expression text;guard text;cap text;begin
 for rec in select p.oid,p.proname,p.proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('create_incoming_webhook','set_incoming_webhook','accept_incoming_webhook','save_calendar_connection','calendar_connection_secret','save_calendar_event_link','calendar_background','calendar_worker_dispatch') loop
 if 'p_team_id'=any(rec.proargnames) then team_expression:='p_team_id';elsif 'p_channel_id'=any(rec.proargnames) then team_expression:='(select team_id from public.channels where id=p_channel_id)';elsif 'p_webhook_id'=any(rec.proargnames) then team_expression:='(select team_id from public.channels where id=(select channel_id from public.incoming_webhooks where id=p_webhook_id))';elsif 'p_connection_id'=any(rec.proargnames) then team_expression:='(select team_id from public.calendar_connections where id=p_connection_id)';else continue;end if;
 guard:=format(' if %s is not null and not private.org_feature((select workspace_id from public.teams where id=%s),''integrations'') then raise exception ''Integrações desativadas.'' using errcode=''42501'';end if; ',team_expression,team_expression);
 d:=pg_get_functiondef(rec.oid);d:=regexp_replace(d,'\mBEGIN\M','BEGIN'||guard,'i');execute d;
 end loop;end$$;

drop policy time_entries_read on public.time_entries;
create policy time_entries_read on public.time_entries for select to authenticated using(private.org_can(team_id,'hours.view') and(user_id=auth.uid() or private.org_can(team_id,'hours.manage')));
drop policy work_schedules_read on public.work_schedules;
create policy work_schedules_read on public.work_schedules for select to authenticated using(private.org_can(team_id,'hours.view') and(user_id=auth.uid() or private.org_can(team_id,'hours.manage')));
drop policy goals_read on public.time_goals;
create policy goals_read on public.time_goals for select to authenticated using(private.org_can(team_id,'hours.view') and(user_id=auth.uid() or private.org_can(team_id,'hours.manage')));
drop policy absences_read on public.absences;
create policy absences_read on public.absences for select to authenticated using(private.org_can(team_id,'management.view') and(user_id=auth.uid() or private.org_can(team_id,'management.manage')));
create policy org_chat_visible on public.channels as restrictive for select to authenticated using(private.org_can(team_id,'chat.view'));
create policy org_presence_visible on public.member_statuses as restrictive for select to authenticated using(private.org_can(team_id,'people.view'));

create function private.org_close_timers(w uuid,u uuid default null,t uuid default null) returns void language plpgsql security definer set search_path='' as $$begin
 update public.time_entries e set ended_at=greatest(clock_timestamp(),e.started_at+interval '1 microsecond') where e.ended_at is null and (u is null or e.user_id=u) and(t is null or e.team_id=t) and e.team_id in(select id from public.teams where workspace_id=w);
 delete from public.paused_timers p where(u is null or p.user_id=u)and(t is null or p.team_id=t)and p.team_id in(select id from public.teams where workspace_id=w);end$$;
revoke all on function private.org_close_timers(uuid,uuid,uuid) from public,anon,authenticated;
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_apply';
 d:=replace(d,'perform private.org_log(w,a,p);','if a=''feature'' and p->>''feature''=''hours'' and not(p->>''enabled'')::boolean then perform private.org_close_timers(w);end if; if a=''member_permissions'' and ((p->''permissions''->>''hours.view'')=''false'' or(p->''permissions''->>''hours.write'')=''false'') then perform private.org_close_timers(w,u,t);end if; perform private.org_log(w,a,p);');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_make_invite';
 d:=replace(d,'insert into private.org_invite_authorizations','if exists(select 1 from auth.users au join public.team_members tm on tm.user_id=au.id and tm.workspace_id=w and tm.is_active where lower(au.email)=lower(p->>''email'') and exists(select 1 from jsonb_array_elements(p->''teams'') item where(item->>''team_id'')::uuid=tm.team_id)) then raise exception ''A pessoa já participa de um time selecionado. Edite o acesso existente.'' using errcode=''22023'';end if; insert into private.org_invite_authorizations');execute d;
end$$;
-- Read gates also apply to open communications after a per-person revocation.
do $$declare rec record;d text;team_expression text;guard text;begin
 for rec in select p.oid,p.proname,p.proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('create_incoming_webhook','set_incoming_webhook','save_calendar_connection','calendar_connection_secret','save_calendar_event_link') loop
 if 'p_team_id'=any(rec.proargnames) then team_expression:='p_team_id';elsif 'p_channel_id'=any(rec.proargnames) then team_expression:='(select team_id from public.channels where id=p_channel_id)';elsif 'p_webhook_id'=any(rec.proargnames) then team_expression:='(select team_id from public.incoming_webhooks where id=p_webhook_id)';else team_expression:='(select team_id from public.calendar_connections where id=p_connection_id)';end if;
 guard:=format(' if not private.org_can(%s,''integrations.write'') then raise exception ''Sem permissão para integrações.'' using errcode=''42501'';end if; ',team_expression);d:=pg_get_functiondef(rec.oid);d:=regexp_replace(d,'\mBEGIN\M','BEGIN'||guard,'i');execute d;end loop;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='accept_incoming_webhook';d:=regexp_replace(d,'\mBEGIN\M','BEGIN if not private.org_feature((select workspace_id from public.teams where id=(select team_id from public.incoming_webhooks where id=p_webhook_id)),''chat'') then raise exception ''Conversas desativadas.'' using errcode=''42501'';end if;','i');execute d;
end$$;
-- Private file listing exposes only the current attachment, not abandoned uploads or replaced files.
create or replace function private.library_file(path text,cap text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.library_nodes d where d.id::text=split_part(path,'/',1) and(cap<>'download' or d.object_path=path) and private.library_can(d.id,cap))$$;
create function private.org_team_available(t uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.teams where id=t and not is_organization_space and private.org_feature(workspace_id,'archived-team:'||t))$$;
revoke all on function private.org_team_available(uuid) from public,anon;grant execute on function private.org_team_available(uuid) to authenticated;
drop policy hide_org_space on public.teams;
create policy hide_org_space on public.teams as restrictive for select to authenticated using(private.org_team_available(id) and private.is_team_participant(id));

-- Content management never grants access to unread private channels or DMs.
create or replace function private.can_moderate_channel(p_channel_id uuid) returns boolean language sql stable security definer set search_path='' as $$select private.can_access_channel(p_channel_id) and exists(select 1 from public.channels c join public.channel_members cm on cm.channel_id=c.id and cm.user_id=auth.uid() where c.id=p_channel_id and(cm.role='moderator' or(c.kind<>'dm' and private.org_can(c.team_id,'chat.manage'))))$$;
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_project';d:=replace(d,'if p_project_id is null then','if p_project_id is not null and not exists(select 1 from public.projects where id=p_project_id and team_id=p_team_id and created_by=actor) and not private.org_can(p_team_id,''projects.manage'') then raise exception ''Sem permissão para editar projetos de outra pessoa.'' using errcode=''42501'';end if; if p_project_id is null then');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_client';if d is not null then d:=replace(d,'''projects.manage''','''management.manage''');execute d;end if;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='can_use_realtime_topic';d:=replace(d,'return private.is_team_participant(resource_id)','return private.org_can(resource_id,''people.view'')');execute d;
end$$;

alter table public.workspace_members add column access_state text not null default 'active' check(access_state in('active','suspended','removed','left'));
update public.workspace_members set access_state='suspended' where not is_active;
create function private.org_membership_state() returns trigger language plpgsql set search_path='' as $$begin if old.is_active<>new.is_active and old.access_state=new.access_state then new.access_state:=case when new.is_active then 'active' else 'suspended' end;end if;return new;end$$;
create trigger org_membership_state before update on public.workspace_members for each row execute function private.org_membership_state();
do $$declare d text;begin
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='org_apply';d:=replace(d,'update public.workspace_members set is_active=false where workspace_id=w and user_id=u','update public.workspace_members set is_active=false,access_state=case when a=''member_remove'' then ''removed'' else ''suspended'' end where workspace_id=w and user_id=u');d:=replace(d,'update public.workspace_members set is_active=true where workspace_id=w and user_id=u','update public.workspace_members set is_active=true,access_state=''active'' where workspace_id=w and user_id=u');execute d;
 select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='organization_console';
 d:=replace(d,'m.role,m.job_title,m.is_active,m.can_approve','m.role,m.job_title,m.is_active,m.can_approve,m.access_state');
 d:=replace(d,'update public.workspace_members set is_active=false where workspace_id=w and user_id=actor','update public.workspace_members set is_active=false,access_state=''left'' where workspace_id=w and user_id=actor');
 d:=replace(d,'update public.workspace_members set is_active=false where workspace_id=w and user_id=tr.from_user','update public.workspace_members set is_active=false,access_state=''left'' where workspace_id=w and user_id=tr.from_user');
 d:=replace(d,'elsif p_command=''create_team'' then','elsif p_command=''revoke_invite'' then if not exists(select 1 from private.team_invitations where id=(p->>''id'')::uuid and workspace_id=w and(private.org_admin(w)or private.org_team_admin(team_id)))then raise exception ''Acesso negado'' using errcode=''42501'';end if;update private.team_invitations set revoked_at=clock_timestamp()where id=(p->>''id'')::uuid and accepted_at is null;perform private.org_log(w,''invitation_revoked'',p);return ''{}''; elsif p_command=''create_team'' then');execute d;
end$$;

commit;
