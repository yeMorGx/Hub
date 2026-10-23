import { hasOrganizationPermission } from "@/lib/organization/server";
import { cookies } from "next/headers";
import {
  isProvider,
  providerConfig,
  sameOrigin,
} from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
import { nonce, challenge } from "@/lib/integrations/crypto";
import { authorizationUrl } from "@/lib/integrations/provider";
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
  if (!session)
    return integrationJson({ error: "Entre com MFA para conectar." }, 401);
  if (!providerConfig(provider).configured)
    return integrationJson(
      { error: "O administrador ainda precisa configurar este provedor." },
      503,
    );
  try {
    const body = await request.json();
    if (typeof body.teamId !== "string")
      return integrationJson({ error: "Time inválido." }, 400);
    const { data: member, error } = await session.client
      .from("team_members")
      .select("is_active")
      .eq("team_id", body.teamId)
      .eq("user_id", session.userId)
      .single();
    if (error || !member?.is_active)
      return integrationJson(
        { error: "Participação no time obrigatória." },
        403,
      );
    if (!await hasOrganizationPermission(session.client,body.teamId,"integrations.write")) return integrationJson({error:"Integrações desativadas ou sem permissão."},403);
    const state = nonce(),
      verifier = nonce();
    const cookie = {
      state,
      verifier,
      teamId: body.teamId,
      userId: session.userId,
      provider,
      expires: Date.now() + 600000,
    };
    (await cookies()).set("__Host-hub-calendar-state", JSON.stringify(cookie), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return integrationJson({
      url: authorizationUrl(provider, state, challenge(verifier)),
    });
  } catch {
    return integrationJson(
      { error: "Não foi possível iniciar a conexão." },
      400,
    );
  }
}
