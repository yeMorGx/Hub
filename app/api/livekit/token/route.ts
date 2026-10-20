import { enforceRoomAccess } from "@/lib/livekit/access";
import { AccessToken } from "livekit-server-sdk";
import { sameOrigin } from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return integrationJson({ error: "Origem inválida." }, 403);
  const session = await integrationSession();
  if (!session) return integrationJson({ error: "Entre com MFA." }, 401);
  const {
    LIVEKIT_URL: url,
    LIVEKIT_API_KEY: key,
    LIVEKIT_API_SECRET: secret,
  } = process.env;
  if (!url || !key || !secret)
    return integrationJson(
      { error: "As chamadas ainda aguardam configuração do administrador." },
      503,
    );
  try {
    const body = await request.json();
    if (typeof body.channelId !== "string")
      return integrationJson({ error: "Canal inválido." }, 400);
    const { data: channel, error } = await session.client
      .from("channels")
      .select("id,team_id,archived_at")
      .eq("id", body.channelId)
      .single();
    if (error || !channel || channel.archived_at)
      return integrationJson({ error: "Canal indisponível." }, 403);
    const [{ data: member }, { data: profile }, { data: participant }] =
      await Promise.all([
        session.client
          .from("team_members")
          .select("is_active")
          .eq("team_id", channel.team_id)
          .eq("user_id", session.userId)
          .single(),
        session.client
          .from("profiles")
          .select("display_name")
          .eq("id", session.userId)
          .single(),
        session.client
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", channel.id)
          .eq("user_id", session.userId)
          .single(),
      ]);
    if (!member?.is_active || !participant)
      return integrationJson(
        { error: "Você precisa participar deste canal." },
        403,
      );
    await enforceRoomAccess(session.client, channel.id, channel.team_id);
    const token = new AccessToken(key, secret, {
      identity: session.userId,
      name: profile?.display_name || "Pessoa do time",
      ttl: "30s",
    });
    token.addGrant({
      roomJoin: true,
      room: `hub:${channel.team_id}:${channel.id}`,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return integrationJson({
      token: await token.toJwt(),
      url,
      room: `hub:${channel.team_id}:${channel.id}`,
    });
  } catch {
    return integrationJson(
      { error: "Não foi possível entrar na chamada." },
      400,
    );
  }
}
