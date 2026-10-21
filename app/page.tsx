import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  INVITATION_COOKIE,
  validInvitationToken,
} from "@/lib/invitations/token";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { LiveHubApp } from "@/components/live-hub-app";
export default async function Home() {
  if (!hasSupabaseConfig()) redirect("/login");
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  if (data.claims.aal !== "aal2") redirect("/mfa");
  if (validInvitationToken((await cookies()).get(INVITATION_COOKIE)?.value))
    redirect("/invite");
  return <LiveHubApp userId={data.claims.sub} />;
}
