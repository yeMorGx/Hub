import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, supabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (
    !hasSupabaseConfig() ||
    request.nextUrl.pathname.startsWith("/demo") ||
    ["/site", "/download", "/privacy", "/robots.txt", "/sitemap.xml"].includes(
      request.nextUrl.pathname,
    )
  )
    return response;
  const { url, key } = supabaseConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  const isAuthCallback =
    request.nextUrl.pathname === "/invite" ||
    request.nextUrl.pathname === "/auth/callback" ||
    request.nextUrl.pathname === "/auth/confirm" ||
    (request.nextUrl.pathname.startsWith("/api/integrations/") &&
      request.nextUrl.pathname.endsWith("/callback"));
  response.headers.set(
    "Referrer-Policy",
    isAuthCallback ? "no-referrer" : "strict-origin-when-cross-origin",
  );
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|pwa/icon/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
