import { isProvider, sameOrigin } from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  if (!sameOrigin(request))
    return integrationJson({ error: "Origem inválida." }, 403);
  const { provider } = await context.params;
  if (!isProvider(provider))
    return integrationJson({ error: "Provedor inválido." }, 404);
  const session = await integrationSession();
  if (!session) return integrationJson({ error: "Entre com MFA." }, 401);
  try {
    const body = await request.json();
    const { data: connection, error } = await session.client
      .from("calendar_connections")
      .select("id")
      .eq("id", body.connectionId)
      .eq("provider", provider)
      .eq("user_id", session.userId)
      .single();
    if (error || !connection)
      return integrationJson({ error: "Conexão indisponível." }, 404);
    const { error: removeError } = await session.client.rpc(
      "disconnect_calendar",
      { p_connection_id: connection.id },
    );
    if (removeError) throw removeError;
    return integrationJson({ ok: true });
  } catch {
    return integrationJson({ error: "Não foi possível desconectar." }, 400);
  }
}
