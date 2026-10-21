import { after } from "next/server";
import {
  backgroundConfigured,
  ensureCalendarWatch,
  backgroundOperation,
  processCalendarJobs,
} from "@/lib/integrations/background";
import { cookies } from "next/headers";
import { isProvider, providerConfig } from "@/lib/integrations/config";
import {
  integrationSession,
  type CalendarSecret,
} from "@/lib/integrations/session";
import { equalState, seal } from "@/lib/integrations/crypto";
import {
  exchangeToken,
  createDedicatedCalendar,
  existingCalendar,
} from "@/lib/integrations/provider";
function done(result: "connected" | "error") {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/?integrations=1&result=${result}`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const store = await cookies();
  const saved = store.get("__Host-hub-calendar-state")?.value;
  store.set("__Host-hub-calendar-state", "", {
    maxAge: 0,
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });
  try {
    const { provider } = await context.params;
    if (!isProvider(provider) || !providerConfig(provider).configured || !saved)
      return done("error");
    const state = JSON.parse(saved);
    const params = new URL(request.url).searchParams,
      code = params.get("code");
    if (
      state.provider !== provider ||
      state.expires < Date.now() ||
      typeof state.state !== "string" ||
      !equalState(params.get("state") || "", state.state) ||
      !code ||
      code.length > 4000
    )
      return done("error");
    const session = await integrationSession();
    if (!session || session.userId !== state.userId) return done("error");
    const { data: team, error } = await session.client
      .from("teams")
      .select("name")
      .eq("id", state.teamId)
      .single();
    if (error || !team) return done("error");
    const { data: member } = await session.client
      .from("team_members")
      .select("is_active")
      .eq("team_id", state.teamId)
      .eq("user_id", session.userId)
      .single();
    if (!member?.is_active) return done("error");
    const token = await exchangeToken(provider, code, state.verifier);
    const { data: previous } = await session.client
      .from("calendar_connections")
      .select("calendar_id")
      .eq("team_id", state.teamId)
      .eq("provider", provider)
      .eq("user_id", session.userId)
      .maybeSingle();
    const calendarId =
      previous &&
      (await existingCalendar(provider, token, previous.calendar_id))
        ? previous.calendar_id
        : await createDedicatedCalendar(
            provider,
            token,
            `ZULU — ${team.name}`,
            "UTC",
          );
    const secret: CalendarSecret = {
      ...token,
      provider,
      teamId: state.teamId,
      userId: session.userId,
      calendarId,
    };
    const { data: connectionId, error: saveError } = await session.client.rpc(
      "save_calendar_connection",
      {
        p_team_id: state.teamId,
        p_provider: provider,
        p_calendar_id: calendarId,
        p_ciphertext: seal(secret),
      },
    );
    if (saveError) return done("error");
    if (connectionId && backgroundConfigured())
      after(async () => {
        await ensureCalendarWatch(connectionId).catch(() => {});
        await backgroundOperation("queue", connectionId)
          .then(() => processCalendarJobs(connectionId))
          .catch(() => {});
      });
    return done("connected");
  } catch {
    return done("error");
  }
}
