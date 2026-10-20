export type CalendarProvider = "google" | "outlook";
export function isProvider(value: string): value is CalendarProvider {
  return value === "google" || value === "outlook";
}
export const appOrigin = (
  process.env.NEXT_PUBLIC_APP_URL || "https://hub-one-azure.vercel.app"
).replace(/\/$/, "");
export function providerConfig(provider: CalendarProvider) {
  const clientId =
    process.env[
      provider === "google"
        ? "GOOGLE_CALENDAR_CLIENT_ID"
        : "MICROSOFT_CALENDAR_CLIENT_ID"
    ];
  const clientSecret =
    process.env[
      provider === "google"
        ? "GOOGLE_CALENDAR_CLIENT_SECRET"
        : "MICROSOFT_CALENDAR_CLIENT_SECRET"
    ];
  const tenant = process.env.MICROSOFT_CALENDAR_TENANT || "common";
  if (!/^[a-zA-Z0-9.-]+$/.test(tenant))
    throw new Error("Invalid tenant configuration");
  return {
    clientId,
    clientSecret,
    tenant,
    redirectUri: `${appOrigin}/api/integrations/${provider}/callback`,
    configured: Boolean(
      clientId &&
      clientSecret &&
      /^[a-f0-9]{64}$/i.test(process.env.HUB_INTEGRATION_ENCRYPTION_KEY || ""),
    ),
  };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return (
    origin === appOrigin ||
    (process.env.NODE_ENV !== "production" &&
      ["http://localhost:3000", "http://127.0.0.1:3000"].includes(origin || ""))
  );
}
