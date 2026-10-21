import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/integrations/config";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
import {
  INVITATION_COOKIE,
  validInvitationToken,
} from "@/lib/invitations/token";
import { errorMessage } from "@/lib/supabase/errors";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return integrationJson({ error: "Origem inválida." }, 403);
  const session = await integrationSession();
  if (!session)
    return integrationJson({ error: "Entre com MFA para aceitar." }, 401);
  const store = await cookies();
  const token = store.get(INVITATION_COOKIE)?.value;
  if (!validInvitationToken(token))
    return integrationJson(
      { error: "Abra o link de convite que você recebeu." },
      400,
    );
  const { data, error } = await session.client.rpc("accept_team_invitation", {
    p_token: token,
  });
  if (error) return integrationJson({ error: errorMessage(error) }, 400);
  store.set(INVITATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return integrationJson({ teamId: data, userId: session.userId });
}
