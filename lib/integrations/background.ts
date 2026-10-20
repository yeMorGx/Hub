import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import type { Database, Json } from "@/lib/supabase/database.types";
import { appOrigin, providerConfig, type CalendarProvider } from "./config";
import { seal, unseal, nonce } from "./crypto";
import {
  refreshToken,
  subscribeCalendar,
  stopCalendarSubscription,
} from "./provider";
import type { CalendarSecret } from "./session";
import { syncCalendar } from "./sync";
export const backgroundConfigured = () =>
  Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.CRON_SECRET &&
    process.env.HUB_INTEGRATION_ENCRYPTION_KEY,
  );
export function calendarAdmin() {
  if (!backgroundConfigured())
    throw new Error("Background calendar sync is not configured");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function backgroundOperation(
  operation: string,
  connectionId?: string,
  payload: Json = {},
) {
  const result = await calendarAdmin().rpc("calendar_background", {
    p_operation: operation,
    p_connection_id: connectionId,
    p_payload: payload,
  });
  if (result.error) throw new Error("Calendar worker unavailable");
  return result.data;
}
function workerClient(connectionId: string) {
  const admin = calendarAdmin();
  return new Proxy(admin, {
    get(target, key) {
      if (key === "rpc")
        return async (operation: string, args: Json) =>
          target.rpc("calendar_worker_dispatch", {
            p_connection_id: connectionId,
            p_operation: operation,
            p_arguments: args,
          });
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as SupabaseClient<Database>;
}
export async function ensureCalendarWatch(connectionId: string) {
  const admin = calendarAdmin(),
    connection = await admin
      .from("calendar_connections")
      .select("*")
      .eq("id", connectionId)
      .single();
  if (connection.error || !connection.data)
    throw new Error("Connection unavailable");
  const c = connection.data,
    provider = c.provider as CalendarProvider;
  if (!providerConfig(provider).configured) return;
  const old = (await backgroundOperation("get_watch", connectionId)) as {
    subscription_id: string;
    resource_id: string | null;
    expires_at: string;
  } | null;
  if (old && Date.parse(old.expires_at) > Date.now() + 86400000) return;
  const secretResult = await admin.rpc("calendar_worker_dispatch", {
    p_connection_id: connectionId,
    p_operation: "calendar_connection_secret",
  });
  if (secretResult.error || typeof secretResult.data !== "string")
    throw new Error("Connection unavailable");
  const secret = unseal<CalendarSecret>(secretResult.data);
  if (
    secret.userId !== c.user_id ||
    secret.teamId !== c.team_id ||
    secret.calendarId !== c.calendar_id ||
    secret.provider !== provider
  )
    throw new Error("Connection mismatch");
  const token = await refreshToken(provider, secret);
  if (token !== secret) {
    const saved = await admin.rpc("calendar_worker_dispatch", {
      p_connection_id: connectionId,
      p_operation: "save_calendar_connection",
      p_arguments: {
        p_team_id: c.team_id,
        p_provider: provider,
        p_calendar_id: c.calendar_id,
        p_ciphertext: seal({ ...secret, ...token }),
      },
    });
    if (saved.error) throw new Error("Token renewal failed");
  }
  const channelToken = nonce(),
    subscription = await subscribeCalendar(
      provider,
      token,
      c.calendar_id,
      channelToken,
      randomUUID(),
      appOrigin + `/api/integrations/webhooks/${provider}`,
    );
  await backgroundOperation("save_watch", connectionId, {
    ...subscription,
    token_hash: tokenHash(channelToken),
  });
  if (old)
    await stopCalendarSubscription(
      provider,
      token,
      old.subscription_id,
      old.resource_id,
    ).catch(() => {});
}
type Job = {
  connection_id: string;
  user_id: string;
  team_id: string;
  provider: CalendarProvider;
  requested_at: string;
};
export async function processCalendarJobs(connectionId?: string) {
  const jobs = (await backgroundOperation("jobs")) as Job[];
  let processed = 0;
  for (const job of (connectionId
    ? jobs.filter((j) => j.connection_id === connectionId)
    : jobs
  ).slice(0, 1)) {
    try {
      if (!providerConfig(job.provider).configured) continue;
      const from = new Date(Date.now() - 30 * 86400000),
        to = new Date();
      to.setMonth(to.getMonth() + 6);
      const result = await syncCalendar(
        workerClient(job.connection_id),
        job.user_id,
        job.connection_id,
        job.provider,
        from.toISOString(),
        to.toISOString(),
      );
      if (result.more) await backgroundOperation("retry", job.connection_id);
      else
        await backgroundOperation("done", job.connection_id, {
          requested_at: job.requested_at,
        });
      processed++;
    } catch {
      await backgroundOperation("retry", job.connection_id).catch(() => {});
    }
  }
  return { processed, pending: jobs.length > processed };
}
export async function renewCalendarWatches() {
  const watches = (await backgroundOperation("watches_due")) as {
    connection_id: string;
  }[];
  for (const watch of watches.slice(0, 1))
    await ensureCalendarWatch(watch.connection_id).catch(() => {});
}
