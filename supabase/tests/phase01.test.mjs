import { PGlite } from '@electric-sql/pglite';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

// PostgreSQL real em WASM. Auth/Realtime são contratos mínimos de teste;
// estes testes não substituem uma execução na stack Supabase completa.
let db;
const users = Object.fromEntries(['admin', 'leader', 'alice', 'bob', 'blueLeader', 'outsider']
  .map((name, i) => [name, `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`]));
const ids = {};
const debug = message => { if (process.env.HUB_DB_TEST_DEBUG) console.error(message); };
const query = (sql, params = []) => { debug(sql.slice(0, 120)); return db.query(sql, params); };
async function scalar(sql, params = []) {
  const { rows } = await query(sql, params);
  return Object.values(rows[0])[0];
}
const count = async (sql, params = []) => Number(await scalar(sql, params));
async function rpc(name, params = []) {
  return scalar(`select public.${name}(${params.map((_, i) => `$${i + 1}`).join(',')}) as result`, params);
}
async function login(user, aal = 'aal2', extraClaims = {}) {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ ...extraClaims, sub: user, role: 'authenticated', aal }),
  ]);
  await db.exec('set role authenticated');
}
async function sqlError(sql, params, code) {
  await db.exec('savepoint expected_error');
  let actual;
  try { await query(sql, params); } catch (error) { actual = error; }
  await db.exec('rollback to savepoint expected_error; release savepoint expected_error');
  assert.ok(actual, `Esperava SQLSTATE ${code}: ${sql}`);
  assert.equal(actual.code, code, actual.message);
}
function scenario(name, fn) {
  test(name, async () => {
    await db.exec('begin');
    try { await fn(); } finally { await db.exec('rollback; reset role'); }
  });
}

before(async () => {
  debug('Inicializando PGlite');
  db = new PGlite();
  debug('Criando contratos Auth/Realtime');
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key, aud text, role text, email text,
      raw_app_meta_data jsonb not null default '{}', raw_user_meta_data jsonb not null default '{}'
    );
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
      $$ select (auth.jwt() ->> 'sub')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create schema realtime;
    create table realtime.messages (
      id uuid primary key default gen_random_uuid(), topic text not null,
      extension text not null, payload jsonb not null default '{}'
    );
    alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as
      $$ select nullif(current_setting('realtime.topic', true), '') $$;
    grant usage on schema realtime to authenticated;
    create publication supabase_realtime;
  `);
  debug('Aplicando migração');
  for (const migration of (await readdir(new URL('../migrations/', import.meta.url))).filter(name => /^\d+_.+\.sql$/.test(name)).sort()) {
    await db.exec(await readFile(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'));
  }
  debug('Criando dados de teste');
  for (const [name, id] of Object.entries(users)) {
    // Papéis nos metadados de usuário não podem conceder permissões.
    await query('insert into auth.users(id, raw_user_meta_data) values ($1, $2)', [id, {
      display_name: name, role: 'admin',
    }]);
  }
  await login(users.admin);
  ids.workspace = await rpc('create_workspace', ['Org A']);
  ids.red = await rpc('create_team', [ids.workspace, 'Red']);
  ids.blue = await rpc('create_team', [ids.workspace, 'Blue']);
  for (const user of ['leader', 'alice', 'bob', 'blueLeader']) {
    await rpc('set_workspace_member', [ids.workspace, users[user], 'member']);
  }
  for (const [team, user, role] of [
    ['red', 'leader', 'leader'], ['red', 'alice', 'member'], ['red', 'bob', 'member'],
    ['blue', 'blueLeader', 'leader'], ['blue', 'alice', 'member'],
  ]) await rpc('set_team_member', [ids[team], users[user], role]);

  await login(users.leader);
  ids.general = await rpc('create_channel', [ids.red, 'geral', 'public', [users.alice]]);
  ids.secret = await rpc('create_channel', [ids.red, 'privado', 'private', [users.alice]]);
  ids.generalMessage = await rpc('send_message', [ids.general, randomUUID(), 'Olá, time']);
  ids.secretMessage = await rpc('send_message', [ids.secret, randomUUID(), 'Conteúdo reservado']);
  ids.project = await rpc('save_project', [ids.red, 'Hub']);
  ids.leaderTime = await rpc('add_manual_time_entry', [ids.red, '2020-01-01T08:00Z', '2020-01-01T09:00Z']);
  ids.event = await rpc('save_event', [ids.red, 'Reunião', '2030-01-01T13:00Z', '2030-01-01T14:00Z', 'meeting']);
  await login(users.bob);
  ids.bobTime = await rpc('add_manual_time_entry', [ids.red, '2020-01-01T10:00Z', '2020-01-01T11:00Z']);
  await login(users.alice);
  ids.aliceTime = await rpc('add_manual_time_entry', [ids.red, '2020-01-01T08:00Z', '2020-01-01T09:00Z', ids.project]);
  ids.aliceBlueTime = await rpc('add_manual_time_entry', [ids.blue, '2020-01-01T12:00Z', '2020-01-01T13:00Z']);
  ids.dm = await rpc('open_dm', [ids.red, users.bob]);
  ids.dmMessage = await rpc('send_message', [ids.dm, randomUUID(), 'DM Alice e Bob']);
  await login(users.blueLeader);
  ids.blueProject = await rpc('save_project', [ids.blue, 'Outro projeto']);
  ids.blueTime = await rpc('add_manual_time_entry', [ids.blue, '2020-01-01T08:00Z', '2020-01-01T09:00Z']);
  await login(users.outsider);
  ids.otherWorkspace = await rpc('create_workspace', ['Org B']);
  ids.otherTeam = await rpc('create_team', [ids.otherWorkspace, 'Outro time']);
  ids.otherChannel = await rpc('create_channel', [ids.otherTeam, 'segredo']);
  await rpc('send_message', [ids.otherChannel, randomUUID(), 'Outro tenant']);
  await rpc('add_manual_time_entry', [ids.otherTeam, '2020-01-01T08:00Z', '2020-01-01T09:00Z']);
  await rpc('save_event', [ids.otherTeam, 'Outro evento', '2030-01-01T13:00Z', '2030-01-01T14:00Z']);
  await db.exec('reset role');
});
after(async () => { if (db) await db.close(); });

scenario('RLS habilitado em todas as 14 tabelas do app; view usa permissões do chamador', async () => {
  const { rows } = await query(`select relname, relrowsecurity from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'`);
  assert.equal(rows.length, 14);
  assert.ok(rows.every(row => row.relrowsecurity));
  assert.deepEqual(await scalar("select reloptions from pg_class where oid='public.channel_unread_counts'::regclass"), ['security_invoker=true']);
});

scenario('RPCs não são executáveis por anon; funções privilegiadas fixam search_path', async () => {
  const { rows } = await query(`select p.oid::regprocedure::text as name, p.proconfig,
    has_function_privilege('anon',p.oid,'execute') as anon_exec from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'`);
  assert.equal(rows.length, 30);
  assert.ok(rows.every(row => !row.anon_exec), JSON.stringify(rows));
  assert.ok(rows.every(row => row.proconfig.includes('search_path=""')));
  assert.equal(await scalar("select has_function_privilege('authenticated','private.active_team_user(uuid,uuid)','execute')"), false);
});

scenario('usuário só encontra sua organização, seus times e perfis compartilhados', async () => {
  await login(users.alice);
  assert.equal(await count('select count(*) from public.workspaces'), 1);
  assert.equal(await count('select count(*) from public.teams'), 2);
  assert.equal(await count('select count(*) from public.profiles'), 5);
  for (const [table, id] of [['teams', ids.otherTeam], ['channels', ids.otherChannel], ['workspaces', ids.otherWorkspace]]) {
    assert.equal(await count(`select count(*) from public.${table} where id=$1`, [id]), 0);
  }
  assert.equal(await count('select count(*) from public.events'), 1);
});

scenario('AAL1 só acessa o próprio perfil; dados colaborativos e RPCs exigem MFA', async () => {
  await login(users.alice, 'aal1');
  assert.equal(await count('select count(*) from public.profiles'), 1);
  for (const table of ['workspaces','workspace_members','teams','team_members','member_statuses',
    'channels','channel_members','messages','projects','tasks','time_entries','events','event_attendees','channel_unread_counts']) {
    assert.equal(await count(`select count(*) from public.${table}`), 0, table);
  }
  await sqlError('select public.create_workspace($1)', ['bloqueado'], '42501');
  await sqlError('select public.send_message($1,$2,$3)', [ids.general, randomUUID(), 'bloqueado'], '42501');
  await query('update public.profiles set display_name=$1 where id=$2', ['Alice', users.alice]);
  assert.equal(await scalar('select display_name from public.profiles'), 'Alice');
});

scenario('anon não lê dados nem executa RPCs, mesmo com claims simulados', async () => {
  await login(users.alice);
  await db.exec('reset role; set role anon');
  await sqlError('select * from public.profiles', [], '42501');
  await sqlError('select public.create_workspace($1)', ['bloqueado'], '42501');
});

scenario('metadados e alterações diretas não permitem elevar papéis', async () => {
  await login(users.alice, 'aal2', { user_metadata: { role: 'admin' } });
  await sqlError("update public.workspace_members set role='admin' where user_id=$1", [users.alice], '42501');
  await sqlError('select public.set_workspace_member($1,$2,$3)', [ids.workspace, users.alice, 'admin'], '42501');
  await sqlError('select public.set_team_member($1,$2,$3)', [ids.red, users.alice, 'leader'], '42501');
  await sqlError('select public.save_project($1,$2)', [ids.red, 'não autorizado'], '42501');
  await sqlError('select public.create_channel($1,$2)', [ids.red, 'não autorizado'], '42501');
});

scenario('perfil: somente campos próprios permitidos; last_seen vem do servidor', async () => {
  await login(users.alice);
  assert.equal((await query('update public.profiles set display_name=$1 where id=$2 returning id', ['spoof', users.bob])).rows.length, 0);
  await sqlError('update public.profiles set id=$1 where id=$2', [randomUUID(), users.alice], '42501');
  await sqlError('update public.profiles set last_seen_at=now() where id=$1', [users.alice], '42501');
  await rpc('touch_last_seen');
  assert.equal(await scalar('select last_seen_at is not null from public.profiles where id=$1', [users.alice]), true);
});

scenario('último admin não pode ser removido ou rebaixado', async () => {
  await login(users.admin);
  await sqlError('select public.set_workspace_member($1,$2,$3)', [ids.workspace, users.admin, 'member'], '23514');
  await sqlError('select public.set_workspace_member($1,$2,$3,$4)', [ids.workspace, users.admin, 'admin', false], '23514');
  await rpc('set_workspace_member', [ids.workspace, users.bob, 'admin']);
  await rpc('set_workspace_member', [ids.workspace, users.admin, 'member']);
  await sqlError('select public.set_workspace_member($1,$2,$3)', [ids.workspace, users.alice, 'admin'], '42501');
});

scenario('membro vê suas horas; líder vê seu time; admin vê todos os times da organização', async () => {
  await login(users.alice);
  assert.equal(await count('select count(*) from public.time_entries'), 2);
  assert.ok((await query('select user_id from public.time_entries')).rows.every(r => r.user_id === users.alice));
  await login(users.leader);
  assert.equal(await count('select count(*) from public.time_entries'), 3);
  assert.equal(await count('select count(*) from public.time_entries where team_id=$1', [ids.blue]), 0);
  await login(users.admin);
  assert.equal(await count('select count(*) from public.time_entries'), 5);
  assert.equal(await count('select count(*) from public.time_entries where team_id=$1', [ids.otherTeam]), 0);
});

scenario('admin ou líder não leem DMs e canais privados sem participação', async () => {
  await login(users.admin);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.secret]), 0);
  assert.equal(await count('select count(*) from public.channels where id=$1', [ids.dm]), 0);
  await sqlError('select public.set_channel_member($1,$2)', [ids.secret, users.admin], '42501');
  await login(users.leader);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.dm]), 0);
});

scenario('canal público é descoberto antes de entrar; mensagens exigem participação', async () => {
  await login(users.bob);
  assert.equal(await count('select count(*) from public.channels where id=$1', [ids.general]), 1);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.general]), 0);
  await rpc('join_public_channel', [ids.general]);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.general]), 1);
  await sqlError('select public.join_public_channel($1)', [ids.secret], '42501');
});

scenario('DM tem par único e exatamente dois participantes; não aceita terceiro', async () => {
  await login(users.bob);
  assert.equal(await rpc('open_dm', [ids.red, users.alice]), ids.dm);
  assert.equal(await count('select count(*) from public.channel_members where channel_id=$1', [ids.dm]), 2);
  await sqlError('select public.set_channel_member($1,$2)', [ids.dm, users.leader], '42501');
  await sqlError('select public.remove_channel_member($1,$2)', [ids.dm, users.bob], '42501');
  await sqlError('select public.open_dm($1,$2)', [ids.red, users.outsider], '42501');
});

scenario('último moderador permanece; remoção de participante corta leitura e envio', async () => {
  await login(users.leader);
  await sqlError('select public.remove_channel_member($1,$2)', [ids.secret, users.leader], '23514');
  await sqlError('select public.set_channel_member($1,$2,$3)', [ids.secret, users.leader, 'member'], '23514');
  await rpc('remove_channel_member', [ids.secret, users.alice]);
  await login(users.alice);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.secret]), 0);
  await sqlError('select public.send_message($1,$2,$3)', [ids.secret, randomUUID(), 'bloqueado'], '42501');
});

scenario('moderador inativo não permite que o último moderador ativo abandone o canal', async () => {
  await login(users.leader);
  await rpc('set_channel_member', [ids.secret, users.alice, 'moderator']);
  await login(users.admin);
  await rpc('set_team_member', [ids.red, users.alice, 'member', false]);
  await login(users.leader);
  await sqlError('select public.remove_channel_member($1,$2)', [ids.secret, users.leader], '23514');
});

scenario('admin recupera canal sem moderador ativo sem entrar nele ou adicionar terceiros', async () => {
  await login(users.admin);
  await sqlError('select public.recover_channel_moderator($1,$2)', [ids.secret, users.alice], '42501');
  await rpc('set_team_member', [ids.red, users.leader, 'leader', false]);
  await sqlError('select public.recover_channel_moderator($1,$2)', [ids.secret, users.admin], '22023');
  await rpc('recover_channel_moderator', [ids.secret, users.alice]);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.secret]), 0);
  await login(users.alice);
  assert.equal(await scalar('select role from public.channel_members where channel_id=$1 and user_id=$2', [ids.secret, users.alice]), 'moderator');
  await rpc('set_channel_member', [ids.secret, users.bob]);
});

scenario('envio idempotente não duplica mensagem nem avança ordinal', async () => {
  await login(users.alice);
  const clientId = randomUUID();
  const message = await rpc('send_message', [ids.general, clientId, 'Olá']);
  assert.equal(await rpc('send_message', [ids.general, clientId, 'Retry']), message);
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.general]), 2);
  assert.equal(await count('select last_message_ordinal from public.channels where id=$1', [ids.general]), 2);
  await sqlError('insert into public.messages(team_id, channel_id, author_id, client_id, ordinal, body) values ($1,$2,$3,$4,999,$5)',
    [ids.red, ids.general, users.bob, randomUUID(), 'forjado'], '42501');
});

scenario('não lidas excluem mensagens próprias; cursor não regride nem ultrapassa o canal', async () => {
  await login(users.alice);
  assert.equal(await count('select unread_count from public.channel_unread_counts where channel_id=$1', [ids.general]), 1);
  await rpc('send_message', [ids.general, randomUUID(), 'própria']);
  assert.equal(await count('select unread_count from public.channel_unread_counts where channel_id=$1', [ids.general]), 1);
  await rpc('mark_channel_read', [ids.general, 999]);
  await rpc('mark_channel_read', [ids.general, 0]);
  assert.equal(await count('select last_read_ordinal from public.channel_members where channel_id=$1 and user_id=$2', [ids.general, users.alice]), 2);
  assert.equal(await count('select unread_count from public.channel_unread_counts where channel_id=$1', [ids.general]), 0);
  await sqlError('select public.mark_channel_read($1,$2)', [ids.general, -1], '22023');
});

scenario('mensagens só podem ser editadas pelo autor e removidas por autor/moderador', async () => {
  await login(users.alice);
  await sqlError('select public.edit_message($1,$2)', [ids.generalMessage, 'forjado'], '42501');
  await sqlError('select public.delete_message($1)', [ids.generalMessage], '42501');
  const message = await rpc('send_message', [ids.general, randomUUID(), 'original']);
  await rpc('edit_message', [message, 'editado']);
  assert.equal(await scalar('select body from public.messages where id=$1', [message]), 'editado');
  await login(users.leader);
  await rpc('delete_message', [message]);
  assert.equal(await scalar("select deleted_at is not null and body='' and ordinal=2 from public.messages where id=$1", [message]), true);
});

scenario('canal arquivado mantém histórico e bloqueia envio/edição/novas entradas', async () => {
  await login(users.leader);
  await rpc('set_channel_archived', [ids.general, true]);
  await sqlError('select public.send_message($1,$2,$3)', [ids.general, randomUUID(), 'bloqueado'], '42501');
  await sqlError('select public.edit_message($1,$2)', [ids.generalMessage, 'bloqueado'], '42501');
  assert.equal(await count('select count(*) from public.messages where channel_id=$1', [ids.general]), 1);
  await login(users.bob);
  await sqlError('select public.join_public_channel($1)', [ids.general], '42501');
});

scenario('mensagem inválida reverte o contador e não deixa buraco no cursor', async () => {
  await login(users.alice);
  await sqlError('select public.send_message($1,$2,$3)', [ids.general, randomUUID(), '  '], '23514');
  assert.equal(await count('select last_message_ordinal from public.channels where id=$1', [ids.general]), 1);
  const message = await rpc('send_message', [ids.general, randomUUID(), 'válida']);
  assert.equal(await count('select ordinal from public.messages where id=$1', [message]), 2);
});

scenario('timer único global, início/parada idempotentes e projeção de status confiável', async () => {
  await login(users.alice);
  const timer = await rpc('start_timer', [ids.red, ids.project, 'atividade']);
  assert.equal(await rpc('start_timer', [ids.red, ids.project, 'atividade']), timer);
  await sqlError('select public.start_timer($1)', [ids.blue], '23505');
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), true);
  await rpc('set_work_status', [ids.red, 'Trabalhando', '💻']);
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), true);
  await sqlError('update public.member_statuses set timer_running=false where team_id=$1', [ids.red], '42501');
  await rpc('stop_timer', [timer]);
  assert.equal(await rpc('stop_timer', [timer]), timer);
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), false);
});

scenario('status do timer é visível sem revelar horas/descrição de outro membro', async () => {
  await login(users.alice);
  const timer = await rpc('start_timer', [ids.red, ids.project, 'atividade reservada']);
  await login(users.bob);
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), true);
  assert.equal(await count('select count(*) from public.time_entries where id=$1', [timer]), 0);
  await sqlError('select public.stop_timer($1)', [timer], '42501');
});

scenario('duração é calculada no banco e edição do histórico recalcula o valor', async () => {
  await login(users.alice);
  assert.equal(await count('select duration_seconds from public.time_entries where id=$1', [ids.aliceTime]), 3600);
  await rpc('edit_time_entry', [ids.aliceTime, '2020-01-01T08:00Z', '2020-01-01T08:30Z', ids.project, 'ajuste']);
  assert.equal(await count('select duration_seconds from public.time_entries where id=$1', [ids.aliceTime]), 1800);
  // PostgreSQL rejeita a coluna gerada antes de avaliar privilégios de UPDATE.
  await sqlError('update public.time_entries set duration_seconds=999 where id=$1', [ids.aliceTime], '428C9');
  await sqlError('update public.time_entries set description=$1 where id=$2', ['forjado', ids.aliceTime], '42501');
  await sqlError('select public.edit_time_entry($1,$2,$3)', [ids.bobTime, '2020-01-01T10:00Z', '2020-01-01T10:30Z'], '42501');
});

scenario('horas rejeitam sobreposição inclusive entre times; intervalos adjacentes são aceitos', async () => {
  await login(users.alice);
  await sqlError('select public.add_manual_time_entry($1,$2,$3)', [ids.blue, '2020-01-01T08:30Z', '2020-01-01T09:30Z'], '23P01');
  await rpc('add_manual_time_entry', [ids.red, '2020-01-01T09:00Z', '2020-01-01T10:00Z']);
  await sqlError('select public.add_manual_time_entry($1,$2,$3)', [ids.red, '2099-01-01T09:00Z', '2099-01-01T10:00Z'], '22023');
  await sqlError('select public.add_manual_time_entry($1,$2,$3)', [ids.red, '2020-01-01T10:00Z', '2020-01-01T10:00Z'], '22023');
});

scenario('lançamento histórico não apaga indicador ativo; intervalo sobre timer é rejeitado', async () => {
  await login(users.alice);
  await rpc('start_timer', [ids.red]);
  await rpc('add_manual_time_entry', [ids.red, '2020-01-02T09:00Z', '2020-01-02T10:00Z']);
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), true);
  const end = await scalar('select clock_timestamp()::text');
  await sqlError('select public.add_manual_time_entry($1, now()-interval \'1 minute\', $2)', [ids.red, end], '23P01');
});

scenario('projeto de outro time é rejeitado pela RPC e pela FK composta', async () => {
  await login(users.alice);
  await sqlError('select public.start_timer($1,$2)', [ids.red, ids.blueProject], '22023');
  await db.exec('reset role');
  await sqlError(`insert into public.time_entries(team_id,user_id,project_id,source,started_at,ended_at)
    values ($1,$2,$3,'manual','2020-02-01T10:00Z','2020-02-01T11:00Z')`, [ids.red, users.alice, ids.blueProject], '23503');
});

scenario('arquivar projeto impede novos timers e preserva edição do histórico existente', async () => {
  await login(users.leader);
  await rpc('save_project', [ids.red, 'Hub', '', ids.project, true]);
  await login(users.alice);
  await sqlError('select public.start_timer($1,$2)', [ids.red, ids.project], '22023');
  await rpc('edit_time_entry', [ids.aliceTime, '2020-01-01T08:00Z', '2020-01-01T08:30Z', ids.project, 'correção']);
  assert.equal(await count('select duration_seconds from public.time_entries where id=$1', [ids.aliceTime]), 1800);
});

scenario('FKs também impedem mensagens e participantes de atravessar times', async () => {
  await sqlError(`insert into public.messages(team_id,channel_id,author_id,client_id,ordinal,body)
    values ($1,$2,$3,$4,2,'inválida')`, [ids.blue, ids.general, users.alice, randomUUID()], '23503');
  await sqlError('insert into public.event_attendees(team_id,event_id,user_id) values ($1,$2,$3)',
    [ids.red, ids.event, users.blueLeader], '23503');
  await sqlError('insert into public.team_members(workspace_id,team_id,user_id) values ($1,$2,$3)',
    [ids.otherWorkspace, ids.red, users.outsider], '23503');
});

scenario('revogar time encerra o timer; histórico permanece e associação própria informa inatividade', async () => {
  await login(users.alice);
  const timer = await rpc('start_timer', [ids.red]);
  await login(users.admin);
  await rpc('set_team_member', [ids.red, users.alice, 'member', false]);
  assert.equal(await scalar('select ended_at is not null from public.time_entries where id=$1', [timer]), true);
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), false);
  await login(users.alice);
  assert.equal(await count('select count(*) from public.time_entries where team_id=$1', [ids.red]), 0);
  assert.equal(await scalar('select is_active from public.team_members where team_id=$1 and user_id=$2', [ids.red, users.alice]), false);
  await sqlError('select public.start_timer($1)', [ids.red], '42501');
});

scenario('revogar organização suspende todos os times e encerra o timer sem excluir registros', async () => {
  await login(users.alice);
  const timer = await rpc('start_timer', [ids.blue]);
  await login(users.admin);
  await rpc('set_workspace_member', [ids.workspace, users.alice, 'member', false]);
  assert.equal(await scalar('select ended_at is not null from public.time_entries where id=$1', [timer]), true);
  await login(users.alice);
  assert.equal(await count('select count(*) from public.time_entries'), 0);
  assert.equal(await count('select count(*) from public.messages'), 0);
  assert.equal(await scalar('select is_active from public.workspace_members where user_id=$1', [users.alice]), false);
});

scenario('calendário é compartilhado pelo time; só organizador/gestor altera eventos', async () => {
  await login(users.bob);
  assert.equal(await count('select count(*) from public.events where id=$1', [ids.event]), 1);
  await sqlError('select public.save_event($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [ids.red, 'alterado', '2030-01-01T13:00Z', '2030-01-01T14:00Z', 'meeting', '', null, 'UTC', ids.event], '42501');
  const own = await rpc('save_event', [ids.red, 'Meu evento', '2030-01-02T13:00Z', '2030-01-02T14:00Z']);
  assert.equal(await scalar('select response from public.event_attendees where event_id=$1 and user_id=$2', [own, users.bob]), 'accepted');
  await login(users.admin);
  await rpc('save_event', [ids.red, 'Alterado pelo admin', '2030-01-01T13:00Z', '2030-01-01T14:00Z', 'meeting', '', null, 'UTC', ids.event]);
});

scenario('convite começa pendente, RSVP é próprio e não permite participante de outro time', async () => {
  await login(users.leader);
  await rpc('invite_event_attendee', [ids.event, users.alice]);
  await sqlError('select public.invite_event_attendee($1,$2)', [ids.event, users.blueLeader], '22023');
  await login(users.alice);
  assert.equal(await scalar('select response from public.event_attendees where event_id=$1 and user_id=$2', [ids.event, users.alice]), 'pending');
  await rpc('respond_to_event', [ids.event, 'accepted']);
  await sqlError("update public.event_attendees set response='declined' where user_id=$1", [users.leader], '42501');
  await login(users.leader);
  await rpc('invite_event_attendee', [ids.event, users.alice]);
  assert.equal(await scalar('select response from public.event_attendees where event_id=$1 and user_id=$2', [ids.event, users.alice]), 'accepted');
});

scenario('eventos validam intervalo, fuso, link; cancelamento impede novo RSVP', async () => {
  await login(users.leader);
  await sqlError('select public.save_event($1,$2,$3,$4)', [ids.red, 'inválido', '2030-01-01T14:00Z', '2030-01-01T13:00Z'], '23514');
  await sqlError('select public.save_event($1,$2,$3,$4,$5,$6,$7,$8)',
    [ids.red, 'inválido', '2030-01-01T13:00Z', '2030-01-01T14:00Z', 'meeting', '', null, 'Não/Existe'], '22023');
  await sqlError('select public.save_event($1,$2,$3,$4,$5,$6,$7)',
    [ids.red, 'inválido', '2030-01-01T13:00Z', '2030-01-01T14:00Z', 'meeting', '', 'javascript:alert(1)'], '23514');
  const event = await rpc('save_event', [ids.red, 'Fuso', '2030-01-01T10:00-03:00', '2030-01-01T11:00-03:00', 'meeting', '', null, 'America/Sao_Paulo']);
  assert.equal(await scalar("select starts_at='2030-01-01T13:00Z'::timestamptz from public.events where id=$1", [event]), true);
  await rpc('cancel_event', [ids.event]);
  await login(users.alice);
  await sqlError('select public.respond_to_event($1,$2)', [ids.event, 'accepted'], '42501');
});

scenario('Realtime: Presence e typing privados exigem escopo, MFA e tópico consistente', async () => {
  await login(users.alice);
  const topic = `team:${ids.red}:presence`;
  await query("select set_config('realtime.topic',$1,false)", [topic]);
  await query("insert into realtime.messages(topic,extension) values ($1,'presence')", [topic]);
  assert.equal(await count('select count(*) from realtime.messages'), 1);
  await sqlError("insert into realtime.messages(topic,extension) values ($1,'presence')", [`team:${ids.otherTeam}:presence`], '42501');
  await login(users.outsider);
  await sqlError("insert into realtime.messages(topic,extension) values ($1,'presence')", [topic], '42501');
  assert.equal(await count('select count(*) from realtime.messages'), 0);
  await login(users.alice, 'aal1');
  await sqlError("insert into realtime.messages(topic,extension) values ($1,'presence')", [topic], '42501');
  await login(users.admin);
  await query("select set_config('realtime.topic',$1,false)", [`channel:${ids.secret}:typing`]);
  await sqlError("insert into realtime.messages(topic,extension) values ($1,'broadcast')", [`channel:${ids.secret}:typing`], '42501');
  assert.equal(await scalar("select private.can_use_realtime_topic('channel:malformado:typing')"), false);
  await login(users.alice);
  const typingTopic = `channel:${ids.dm}:typing`;
  await query("select set_config('realtime.topic',$1,false)", [typingTopic]);
  await query("insert into realtime.messages(topic,extension) values ($1,'broadcast')", [typingTopic]);
  assert.equal(await count('select count(*) from realtime.messages'), 1);
});

scenario('publicação inclui dados do MVP, sem DELETE de membros de canal', async () => {
  const tables = (await query("select tablename from pg_publication_tables where pubname='supabase_realtime'")).rows.map(r => r.tablename).sort();
  assert.deepEqual(tables, ['channels','event_attendees','events','member_statuses','messages','projects','tasks','team_members','time_entries','workspace_members'].sort());
  assert.ok(!tables.includes('channel_members'));
});

scenario('script de validação remota executa 28 verificações e reverte suas fixtures', async () => {
  const result = await db.exec(await readFile(new URL('./phase01.live.sql', import.meta.url), 'utf8'));
  const report = result.at(-1).rows[0].validation;
  assert.equal(report.passed, 28);
  assert.equal(report.failed, 0);
  assert.equal(report.fixtures_rolled_back, true);
});

scenario('helper interno perde EXECUTE de clientes sem alterar sua implementação', async () => {
  await db.exec(`create function public.rls_auto_enable() returns event_trigger
    language plpgsql security definer set search_path=pg_catalog as $$ begin return; end; $$;
    grant execute on function public.rls_auto_enable() to anon, authenticated;`);
  const definition = await scalar("select pg_get_functiondef('public.rls_auto_enable()'::regprocedure)");
  const sql = await readFile(new URL('../migrations/20261019232146_restrict_internal_rls_helper.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  for (const role of ['anon', 'authenticated']) {
    assert.equal(await scalar("select has_function_privilege($1,'public.rls_auto_enable()','execute')", [role]), false);
  }
  assert.equal(await scalar("select has_function_privilege(current_user,'public.rls_auto_enable()','execute')"), true);
  assert.equal(await scalar("select pg_get_functiondef('public.rls_auto_enable()'::regprocedure)"), definition);
});

scenario('restrição do helper é segura em um ambiente que ainda não possui esse helper', async () => {
  assert.equal(await scalar("select to_regprocedure('public.rls_auto_enable()')"), null);
  await db.exec(await readFile(new URL('../migrations/20261019232146_restrict_internal_rls_helper.sql', import.meta.url), 'utf8'));
  assert.equal(await scalar("select to_regprocedure('public.rls_auto_enable()')"), null);
});

// Phase 2: exercise the actual migrated RPCs and policies, without Auth emails.
const taskRpcNames = ['save_task', 'move_task', 'archive_task', 'start_task_timer'];
async function taskFixture(assignee = users.alice, project = ids.project) {
  await login(users.leader);
  return rpc('save_task', [ids.red, 'Implementar o quadro', 'Contexto', project, assignee, '2030-01-01', 'high']);
}
async function taskRow(id) {
  return (await query('select * from public.tasks where id=$1', [id])).rows[0];
}
async function saveExistingTask(id, overrides = {}) {
  const task = { ...await taskRow(id), ...overrides };
  return rpc('save_task', [task.team_id, task.title, task.description, task.project_id, task.assignee_id, task.due_on, task.priority, task.id, task.version]);
}

scenario('Kanban: tarefa pertence ao time, recebe autor real e versão inicial', async () => {
  const id = await taskFixture();
  const task = await taskRow(id);
  assert.equal(task.created_by, users.leader);
  assert.equal(task.team_id, ids.red);
  assert.equal(task.project_id, ids.project);
  assert.equal(task.assignee_id, users.alice);
  assert.equal(task.status, 'todo');
  assert.equal(task.priority, 'high');
  assert.equal(task.version, 1);
  await login(users.alice);
  assert.equal(await count('select count(*) from public.tasks where id=$1', [id]), 1);
  await login(users.outsider);
  assert.equal(await count('select count(*) from public.tasks where id=$1', [id]), 0);
});

scenario('Kanban: nenhuma RPC concede execução anônima e todas fixam search_path', async () => {
  for (const name of taskRpcNames) {
    const { rows } = await query(`select p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'execute') as anon_exec,
      has_function_privilege('authenticated', p.oid, 'execute') as member_exec
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1`, [name]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].prosecdef, true);
    assert.equal(rows[0].anon_exec, false);
    assert.equal(rows[0].member_exec, true);
    assert.ok(rows[0].proconfig.includes('search_path=""'));
  }
});

scenario('Kanban: AAL1 não lê tarefas nem cria, move, arquiva ou inicia timer', async () => {
  const id = await taskFixture();
  await login(users.alice, 'aal1');
  assert.equal(await count('select count(*) from public.tasks'), 0);
  await sqlError('select public.save_task($1,$2)', [ids.red, 'Bloqueado'], '42501');
  await sqlError('select public.move_task($1,$2,$3)', [id, 'done', 1], '42501');
  await sqlError('select public.archive_task($1,$2)', [id, 1], '42501');
  await sqlError('select public.start_task_timer($1)', [id], '42501');
});

scenario('Kanban: cliente não grava diretamente a tabela', async () => {
  const id = await taskFixture();
  await login(users.alice);
  await sqlError('update public.tasks set status=$1 where id=$2', ['done', id], '42501');
  await sqlError('delete from public.tasks where id=$1', [id], '42501');
  await sqlError('insert into public.tasks(team_id,title,created_by) values ($1,$2,$3)', [ids.red, 'Direto', users.alice], '42501');
});

scenario('Kanban: título, descrição e prioridade inválidos são rejeitados no servidor', async () => {
  await login(users.alice);
  for (const title of ['', '  ', 'x'.repeat(181), null]) {
    await sqlError('select public.save_task($1,$2)', [ids.red, title], '22023');
  }
  await sqlError('select public.save_task($1,$2,$3)', [ids.red, 'Título', 'x'.repeat(10001)], '22023');
  await sqlError('select public.save_task($1,$2,$3,$4,$5,$6,$7)', [ids.red, 'Título', '', null, null, null, 'urgent'], '22023');
});

scenario('Kanban: projeto e responsável não podem atravessar times', async () => {
  await login(users.alice);
  await sqlError('select public.save_task($1,$2,$3,$4)', [ids.red, 'Outro projeto', '', ids.blueProject], '22023');
  await sqlError('select public.save_task($1,$2,$3,$4,$5)', [ids.red, 'Outro responsável', '', null, users.blueLeader], '22023');
  await sqlError('select public.save_task($1,$2)', [ids.otherTeam, 'Outro tenant'], '42501');
});

scenario('Kanban: responsável e criador editam, terceiro não edita nem move', async () => {
  const id = await taskFixture();
  await login(users.bob);
  await sqlError('select public.move_task($1,$2,$3)', [id, 'done', 1], '42501');
  await sqlError('select public.save_task($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [ids.red, 'Invasão', '', null, null, null, 'normal', id, 1], '42501');
  await login(users.alice);
  await saveExistingTask(id, { title: 'Alterada pela responsável' });
  assert.equal((await taskRow(id)).version, 2);
  await rpc('move_task', [id, 'in_progress', 2]);
  await login(users.leader);
  await saveExistingTask(id, { description: 'Alterada pelo criador' });
  assert.equal((await taskRow(id)).version, 4);
});

scenario('Kanban: tarefa sem responsável permite colaboração mas não arquivamento por terceiro', async () => {
  const id = await taskFixture(null);
  await login(users.bob);
  await saveExistingTask(id, { title: 'Colaboração' });
  await rpc('move_task', [id, 'in_progress', 2]);
  await sqlError('select public.archive_task($1,$2)', [id, 3], '42501');
});

scenario('Kanban: liderança participante altera cards de outros autores', async () => {
  await login(users.alice);
  const id = await rpc('save_task', [ids.red, 'Card de Alice', '', null, users.bob]);
  await login(users.leader);
  await saveExistingTask(id, { title: 'Revisão da liderança' });
  await rpc('move_task', [id, 'done', 2]);
  await rpc('archive_task', [id, 3]);
  assert.ok((await taskRow(id)).archived_at);
});

scenario('Kanban: admin fora do time consulta, mas não cria, edita ou inicia horas', async () => {
  const id = await taskFixture();
  await login(users.admin);
  await rpc('set_team_member', [ids.red, users.admin, 'member', false]);
  assert.equal(await count('select count(*) from public.tasks where id=$1', [id]), 1);
  await sqlError('select public.save_task($1,$2)', [ids.red, 'Admin sem participação'], '42501');
  await sqlError('select public.move_task($1,$2,$3)', [id, 'done', 1], '42501');
  await sqlError('select public.archive_task($1,$2)', [id, 1], '42501');
  await sqlError('select public.start_task_timer($1)', [id], '42501');
});

scenario('Kanban: versão antiga rejeita salvar, mover e arquivar sem sobrescrever dados', async () => {
  const id = await taskFixture();
  await rpc('move_task', [id, 'in_progress', 1]);
  await sqlError('select public.save_task($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [ids.red, 'Stale', '', null, null, null, 'normal', id, 1], '40001');
  await sqlError('select public.move_task($1,$2,$3)', [id, 'done', 1], '40001');
  await sqlError('select public.archive_task($1,$2)', [id, 1], '40001');
  const task = await taskRow(id);
  assert.equal(task.version, 2);
  assert.equal(task.status, 'in_progress');
  assert.equal(task.title, 'Implementar o quadro');
  assert.equal(task.archived_at, null);
});

scenario('Kanban: etapa desconhecida ou nula é rejeitada', async () => {
  const id = await taskFixture();
  for (const status of ['paused', null]) await sqlError('select public.move_task($1,$2,$3)', [id, status, 1], '22023');
});

scenario('Kanban: timer associa tarefa, projeto, autor das horas e cópia do título', async () => {
  const id = await taskFixture();
  await login(users.alice);
  const entry = await rpc('start_task_timer', [id]);
  const record = (await query('select * from public.time_entries where id=$1', [entry])).rows[0];
  assert.equal(record.task_id, id);
  assert.equal(record.project_id, ids.project);
  assert.equal(record.team_id, ids.red);
  assert.equal(record.user_id, users.alice);
  assert.equal(record.description, 'Implementar o quadro');
  assert.equal(record.source, 'timer');
  assert.equal(record.ended_at, null);
  assert.equal((await taskRow(id)).status, 'in_progress');
  assert.equal((await taskRow(id)).version, 2);
  assert.equal(await scalar('select timer_running from public.member_statuses where team_id=$1 and user_id=$2', [ids.red, users.alice]), true);
});

scenario('Kanban: repetição do mesmo início retorna o timer mesmo após renomear o card', async () => {
  const id = await taskFixture();
  await login(users.alice);
  const entry = await rpc('start_task_timer', [id]);
  await saveExistingTask(id, { title: 'Título novo' });
  assert.equal(await rpc('start_task_timer', [id]), entry);
  assert.equal(await count('select count(*) from public.time_entries where task_id=$1', [id]), 1);
  assert.equal(await scalar('select description from public.time_entries where id=$1', [entry]), 'Implementar o quadro');
});

scenario('Kanban: iniciar em outro card ou time respeita o timer único global', async () => {
  const first = await taskFixture();
  const second = await rpc('save_task', [ids.red, 'Segundo']);
  await login(users.alice);
  const blue = await rpc('save_task', [ids.blue, 'Outro time']);
  await rpc('start_task_timer', [first]);
  for (const id of [second, blue]) await sqlError('select public.start_task_timer($1)', [id], '23505');
  await sqlError('select public.start_timer($1,$2,$3)', [ids.blue, null, 'Timer geral'], '23505');
});

scenario('Kanban: timer geral já ativo também bloqueia início pelo card', async () => {
  const id = await taskFixture();
  await login(users.alice);
  await rpc('start_timer', [ids.blue, null, 'Em andamento']);
  await sqlError('select public.start_task_timer($1)', [id], '23505');
});

scenario('Kanban: registrar horas não concede edição de tarefa alheia', async () => {
  const id = await taskFixture();
  await login(users.bob);
  await rpc('start_task_timer', [id]);
  assert.equal((await taskRow(id)).status, 'todo');
  assert.equal((await taskRow(id)).version, 1);
  await sqlError('select public.move_task($1,$2,$3)', [id, 'done', 1], '42501');
});

scenario('Kanban: tarefa concluída/arquivada e projeto arquivado bloqueiam novo timer', async () => {
  const done = await taskFixture();
  const archived = await rpc('save_task', [ids.red, 'Arquivada']);
  await rpc('move_task', [done, 'done', 1]);
  await rpc('archive_task', [archived, 1]);
  await login(users.alice);
  for (const id of [done, archived]) await sqlError('select public.start_task_timer($1)', [id], '22023');
  await login(users.leader);
  const projectTask = await rpc('save_task', [ids.red, 'Projeto arquivado', '', ids.project]);
  await rpc('save_project', [ids.red, 'Hub', '', ids.project, true]);
  await sqlError('select public.start_task_timer($1)', [projectTask], '22023');
});

scenario('Kanban: concluir e arquivar preservam timer ativo e histórico', async () => {
  const id = await taskFixture();
  await login(users.alice);
  const entry = await rpc('start_task_timer', [id]);
  await rpc('move_task', [id, 'done', 2]);
  assert.equal(await scalar('select ended_at from public.time_entries where id=$1', [entry]), null);
  await login(users.leader);
  await rpc('archive_task', [id, 3]);
  await rpc('archive_task', [id, 3]);
  assert.equal(await scalar('select ended_at from public.time_entries where id=$1', [entry]), null);
  await sqlError('select public.move_task($1,$2,$3)', [id, 'todo', 4], '22023');
  await login(users.alice);
  await rpc('stop_timer', [entry]);
  assert.equal(await rpc('stop_timer', [entry]), entry);
  assert.ok(await scalar('select ended_at from public.time_entries where id=$1', [entry]));
  assert.equal(await scalar('select task_id from public.time_entries where id=$1', [entry]), id);
});

scenario('Kanban: revogação corta leitura/escrita e encerra horas do card', async () => {
  const id = await taskFixture();
  await login(users.alice);
  const entry = await rpc('start_task_timer', [id]);
  await login(users.admin);
  await rpc('set_team_member', [ids.red, users.alice, 'member', false]);
  assert.ok(await scalar('select ended_at from public.time_entries where id=$1', [entry]));
  await login(users.alice);
  assert.equal(await count('select count(*) from public.tasks where id=$1', [id]), 0);
  await sqlError('select public.start_task_timer($1)', [id], '42501');
  await sqlError('select public.move_task($1,$2,$3)', [id, 'done', 2], '42501');
});

scenario('Kanban: FK de horas impede associação a tarefa de outro time', async () => {
  const id = await taskFixture();
  await db.exec('reset role');
  await sqlError(`insert into public.time_entries(team_id,user_id,task_id,description,source,started_at,ended_at)
    values ($1,$2,$3,'FK','manual','2020-02-01T08:00Z','2020-02-01T09:00Z')`, [ids.blue, users.alice, id], '23503');
});
