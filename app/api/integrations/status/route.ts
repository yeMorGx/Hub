import { backgroundConfigured } from "@/lib/integrations/background";
import {
  integrationJson,
  integrationSession,
} from "@/lib/integrations/session";
import { providerConfig } from "@/lib/integrations/config";
export async function GET() {
  const session = await integrationSession();
  if (!session)
    return integrationJson(
      { error: "Entre com MFA para acessar integrações." },
      401,
    );
  return integrationJson({
    google: providerConfig("google").configured,
    outlook: providerConfig("outlook").configured,
    livekit: Boolean(
      process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET,
    ),
    push: process.env.NEXT_PUBLIC_PUSH_ENABLED === "true",
    sso: process.env.NEXT_PUBLIC_AZURE_SSO_ENABLED === "true",
    backgroundSync: backgroundConfigured(),
  });
}
