import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { InvitationScreen } from "@/components/invitation-screen";
export const metadata: Metadata = {
  title: "Convite para o time · Hub",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function InvitePage() {
  const configured = hasSupabaseConfig();
  const claims = configured
    ? (await (await createClient()).auth.getClaims()).data?.claims
    : null;
  return (
    <InvitationScreen
      configured={configured}
      authenticated={Boolean(claims?.sub)}
      mfaReady={claims?.aal === "aal2"}
    />
  );
}
