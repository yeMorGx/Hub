import { NextResponse } from "next/server";

type AuthDestination = "/" | "/reset-password" | "/login?notice=link-expired";

// A relative Location preserves the browser's origin behind reverse proxies.
// Destinations are app literals; neither request hosts nor user URLs select it.
export function redirectWithinApp(destination: AuthDestination) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: destination,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
