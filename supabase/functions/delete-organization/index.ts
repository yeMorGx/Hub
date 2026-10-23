import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const headers = {
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const pending = 'A exclusão foi iniciada, mas ainda não terminou. Tente novamente para concluir.';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond({ error: 'Método não permitido.' }, 405);
  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond({ error: 'Entre novamente para continuar.' }, 401);
  try {
    const reader = request.body?.getReader();
    if (!reader) return respond({ error: 'Solicitação inválida.' }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1500) { await reader.cancel(); return respond({ error: 'Solicitação inválida.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (typeof input.workspace_id !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(input.workspace_id)
      || typeof input.confirmation_name !== 'string' || input.confirmation_name.length > 120) {
      return respond({ error: 'Confira a organização e seu nome.' }, 400);
    }
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const identity = await user.auth.getUser(token);
    if (identity.error || !identity.data.user) return respond({ error: 'Entre novamente para continuar.' }, 401);
    const args = { p_workspace_id: input.workspace_id, p_confirmation_name: input.confirmation_name };
    const begin = await user.rpc('begin_organization_deletion', args);
    if (begin.error) return respond({ ok: false, error: begin.error.code === '42501'
      ? 'Somente o dono, com MFA ativo, pode excluir a organização.'
      : 'Confira o nome da organização e tente novamente.' });

    // Each successful Storage removal disappears from the next page. A retry
    // resumes remaining files, including after a connection or runtime timeout.
    let previousPage = '';
    for (let page = 0; page < 30; page++) {
      const files = await user.rpc('organization_deletion_files', { p_workspace_id: input.workspace_id });
      if (files.error) return respond({ ok: false, pending: true, error: pending });
      const items = files.data as { bucket_id: string; object_path: string }[];
      if (!items.length) {
        const finish = await user.rpc('finalize_organization_deletion', args);
        if (finish.error) return respond({ ok: false, pending: true, error: pending });
        return respond({ ok: true, completed: true });
      }
      const signature = JSON.stringify(items);
      if (signature === previousPage) return respond({ ok: false, pending: true, error: pending });
      previousPage = signature;
      for (const bucket of ['hub-files', 'organization-library']) {
        const paths = items.filter(item => item.bucket_id === bucket).map(item => item.object_path);
        if (!paths.length) continue;
        const removed = await admin.storage.from(bucket).remove(paths);
        if (removed.error) return respond({ ok: false, pending: true, error: pending });
      }
    }
    return respond({ ok: true, completed: false, pending: true });
  } catch {
    return respond({ ok: false, error: 'Não foi possível concluir a exclusão. Confira sua conexão e tente novamente.' });
  }
});
