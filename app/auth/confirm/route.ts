import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirectWithinApp } from "@/lib/supabase/redirect";
import type { EmailOtpType } from "@supabase/supabase-js";
const types = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (hash && type && types.has(type)) {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error) {
      return redirectWithinApp(
        type === "recovery" || type === "invite" ? "/reset-password" : "/",
      );
    }
  }
  return redirectWithinApp("/login?notice=link-expired");
}
