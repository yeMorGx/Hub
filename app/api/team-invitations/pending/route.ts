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
  try {
    const text = await request.text();
    if (text.length > 256)
      return integrationJson({ error: "Link de convite inválido." }, 400);
    const { token } = JSON.parse(text);
    if (!validInvitationToken(token))
      return integrationJson({ error: "Link de convite inválido." }, 400);
    (await cookies()).set(INVITATION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
    return integrationJson({ ok: true });
  } catch {
    return integrationJson({ error: "Não foi possível abrir o convite." }, 400);
  }
}
export async function GET() {
  const session = await integrationSession();
  if (!session)
    return integrationJson(
      { error: "Entre e confirme a segunda etapa para aceitar o convite." },
      401,
    );
  const token = (await cookies()).get(INVITATION_COOKIE)?.value;
  if (!validInvitationToken(token))
    return integrationJson(
      { error: "Abra o link de convite que você recebeu." },
      400,
    );
  const { data, error } = await session.client.rpc("preview_team_invitation", {
    p_token: token,
  });
  return error
    ? integrationJson({ error: errorMessage(error) }, 400)
    : integrationJson({ invitation: data });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return integrationJson({ error: "Origem inválida." }, 403);
  (await cookies()).set(INVITATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return integrationJson({ ok: true });
}
