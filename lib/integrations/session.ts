import { createClient } from "@/lib/supabase/server";
export async function integrationSession() {
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub || data.claims.aal !== "aal2") return null;
  return { client, userId: data.claims.sub };
}
export function integrationJson(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export type CalendarSecret = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  provider: "google" | "outlook";
  teamId: string;
  userId: string;
  calendarId: string;
};
