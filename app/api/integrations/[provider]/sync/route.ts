import {
  isProvider,
  providerConfig,
  sameOrigin,
} from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
import { syncCalendar } from "@/lib/integrations/sync";
export const maxDuration = 60;
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
  if (!providerConfig(provider).configured)
    return integrationJson(
      { error: "Este calendário ainda não foi configurado." },
      503,
    );
  try {
    const body = await request.json(),
      from = new Date(body.from),
      to = new Date(body.to);
    if (
      typeof body.connectionId !== "string" ||
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      to <= from ||
      to.getTime() - from.getTime() > 367 * 86400000
    )
      return integrationJson(
        { error: "Escolha um período de até um ano." },
        400,
      );
    const resolutions: Record<string, "hub" | "external"> = {};
    for (const [key, value] of Object.entries(body.resolutions || {}).slice(
      0,
      100,
    ))
      if (value === "hub" || value === "external") resolutions[key] = value;
    return integrationJson(
      await syncCalendar(
        session.client,
        session.userId,
        body.connectionId,
        provider,
        from.toISOString(),
        to.toISOString(),
        resolutions,
      ),
    );
  } catch {
    return integrationJson(
      {
        error:
          "Sincronização interrompida. Reconecte se a autorização expirou.",
      },
      400,
    );
  }
}
