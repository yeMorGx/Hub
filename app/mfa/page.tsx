import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { MfaScreen } from "@/components/auth/mfa-screen";
export default async function MfaPage() {
  if (!hasSupabaseConfig()) redirect("/login");
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  if (data.claims.aal === "aal2") redirect("/");
  return <MfaScreen />;
}
