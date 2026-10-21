import { sameOrigin } from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
import { enforceRoomAccess } from "@/lib/livekit/access";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return integrationJson({ error: "Origem inválida." }, 403);
  const session = await integrationSession();
  if (!session) return integrationJson({ error: "Entre com MFA." }, 401);
  if (
    !process.env.LIVEKIT_URL ||
    !process.env.LIVEKIT_API_KEY ||
    !process.env.LIVEKIT_API_SECRET
  )
    return integrationJson({ error: "Chamadas não configuradas." }, 503);
  try {
    const input = await request.json();
    if (typeof input.channelId !== "string")
      return integrationJson({ error: "Canal inválido." }, 400);
    const channel = await session.client
      .from("channels")
      .select("id,team_id,archived_at")
      .eq("id", input.channelId)
      .single();
    if (channel.error || !channel.data || channel.data.archived_at)
      return integrationJson({ error: "Canal indisponível." }, 403);
    await enforceRoomAccess(
      session.client,
      channel.data.id,
      channel.data.team_id,
    );
    return integrationJson({ ok: true });
  } catch {
    return integrationJson({ error: "Acesso à chamada indisponível." }, 403);
  }
}
