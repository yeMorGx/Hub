import { appOrigin, sameOrigin } from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
import { invitationToken } from "@/lib/invitations/token";
import { errorMessage } from "@/lib/supabase/errors";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return integrationJson({ error: "Origem inválida." }, 403);
  const session = await integrationSession();
  if (!session)
    return integrationJson({ error: "Entre com MFA para convidar." }, 401);
  try {
    const text = await request.text();
    if (text.length > 2048)
      return integrationJson({ error: "Convite inválido." }, 400);
    const body = JSON.parse(text);
    if (
      typeof body.email !== "string" ||
      body.email.length > 254 ||
      typeof body.teamId !== "string" ||
      !["member", "leader"].includes(body.role)
    )
      return integrationJson(
        { error: "Confira o e-mail e o papel da pessoa." },
        400,
      );
    const { token, hash } = invitationToken();
    const { data, error } = await session.client.rpc("create_team_invitation", {
      p_team_id: body.teamId,
      p_email: body.email,
      p_role: body.role,
      p_token_hash: hash,
    });
    if (error)
      return integrationJson(
        { error: errorMessage(error) },
        error.code === "42501" ? 403 : 400,
      );
    return integrationJson(
      { invitation: data, url: `${appOrigin}/invite#token=${token}` },
      201,
    );
  } catch {
    return integrationJson(
      { error: "Não foi possível criar o convite. Tente novamente." },
      400,
    );
  }
}
