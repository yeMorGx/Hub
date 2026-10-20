import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirectWithinApp } from "@/lib/supabase/redirect";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next =
    request.nextUrl.searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : "/";
  if (code) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectWithinApp(next);
    }
  }
  return redirectWithinApp("/login?notice=link-expired");
}
