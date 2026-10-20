import { providerConfig, type CalendarProvider } from "./config";
export type ProviderToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};
export type ExternalEvent = {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  updated: string;
  cancelled: boolean;
  hubId?: string;
  etag?: string;
};
const google = "https://www.googleapis.com/calendar/v3";
const graph = "https://graph.microsoft.com/v1.0";
function tokenEndpoint(provider: CalendarProvider) {
  return provider === "google"
    ? "https://oauth2.googleapis.com/token"
    : `https://login.microsoftonline.com/${providerConfig(provider).tenant}/oauth2/v2.0/token`;
}
export function authorizationUrl(
  provider: CalendarProvider,
  state: string,
  codeChallenge: string,
) {
  const cfg = providerConfig(provider);
  if (!cfg.configured) throw new Error("Provider is not configured");
  const url = new URL(
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : `https://login.microsoftonline.com/${cfg.tenant}/oauth2/v2.0/authorize`,
  );
  url.search = new URLSearchParams({
    client_id: cfg.clientId!,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    scope:
      provider === "google"
        ? "https://www.googleapis.com/auth/calendar.app.created"
        : "offline_access Calendars.ReadWrite",
    ...(provider === "google"
      ? { access_type: "offline", prompt: "consent" }
      : { prompt: "select_account" }),
  }).toString();
  return url.href;
}
export async function exchangeToken(
  provider: CalendarProvider,
  code: string,
  verifier: string,
) {
  const cfg = providerConfig(provider);
  return tokenRequest(provider, {
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: cfg.redirectUri,
  });
}
async function tokenRequest(
  provider: CalendarProvider,
  params: Record<string, string>,
  previous?: ProviderToken,
): Promise<ProviderToken> {
  const cfg = providerConfig(provider);
  const response = await fetch(tokenEndpoint(provider), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      client_id: cfg.clientId!,
      client_secret: cfg.clientSecret!,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Provider authorization failed");
  const data = await response.json();
  if (typeof data.access_token !== "string")
    throw new Error("Provider authorization failed");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || previous?.refreshToken || "",
    expiresAt:
      Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000,
  };
}
export async function refreshToken(
  provider: CalendarProvider,
  token: ProviderToken,
) {
  if (token.expiresAt > Date.now() + 60000) return token;
  if (!token.refreshToken) throw new Error("Reconnect the calendar");
  return tokenRequest(
    provider,
    { grant_type: "refresh_token", refresh_token: token.refreshToken },
    token,
  );
}
async function api<T>(
  provider: CalendarProvider,
  token: ProviderToken,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    allowConflict?: boolean;
    allowGone?: boolean;
    etag?: string;
  } = {},
): Promise<T> {
  const response = await fetch(
    (provider === "google" ? google : graph) + path,
    {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
        ...(options.etag ? { "If-Match": options.etag } : {}),
        ...(provider === "outlook" ? { Prefer: 'outlook.timezone="UTC"' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (
    (response.status === 409 && options.allowConflict) ||
    ([404, 410].includes(response.status) && options.allowGone)
  )
    return null as T;
  if (!response.ok)
    throw new Error(`Calendar provider returned HTTP ${response.status}`);
  if (response.status === 204) return null as T;
  return response.json();
}
export async function createDedicatedCalendar(
  provider: CalendarProvider,
  token: ProviderToken,
  name: string,
  timezone: string,
) {
  const result =
    provider === "google"
      ? await api<{ id: string }>(provider, token, "/calendars", {
          method: "POST",
          body: { summary: name, timeZone: timezone },
        })
      : await api<{ id: string }>(provider, token, "/me/calendars", {
          method: "POST",
          body: { name },
        });
  if (!result.id) throw new Error("Calendar creation failed");
  return result.id;
}
function utc(value: string) {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + "Z";
}
export async function listExternalEvents(
  provider: CalendarProvider,
  token: ProviderToken,
  calendarId: string,
  from: string,
  to: string,
) {
  const all: ExternalEvent[] = [];
  let page: string | undefined;
  let pages = 0;
  do {
    if (++pages > 30)
      throw new Error("Too many calendar events. Use a shorter period.");
    if (provider === "google") {
      const params = new URLSearchParams({
        timeMin: from,
        timeMax: to,
        singleEvents: "true",
        showDeleted: "true",
        maxResults: "250",
        ...(page ? { pageToken: page } : {}),
      });
      const result = await api<{
        items?: {
          id: string;
          summary?: string;
          description?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          updated?: string;
          status?: string;
          extendedProperties?: { private?: { hubEventId?: string } };
        }[];
        nextPageToken?: string;
      }>(
        provider,
        token,
        `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      );
      for (const e of result.items || [])
        all.push({
          id: e.id,
          title: e.summary || "Evento",
          description: e.description || "",
          start: e.start?.dateTime || e.start?.date + "T00:00:00Z",
          end: e.end?.dateTime || e.end?.date + "T00:00:00Z",
          updated: e.updated || "",
          cancelled: e.status === "cancelled",
          hubId: e.extendedProperties?.private?.hubEventId,
        });
      page = result.nextPageToken;
    } else {
      const path =
        page ||
        `/me/calendars/${encodeURIComponent(calendarId)}/calendarView?${new URLSearchParams({ startDateTime: from, endDateTime: to, $top: "250", $select: "id,subject,body,start,end,lastModifiedDateTime,isCancelled,transactionId" })}`;
      const result = await api<{
        value?: {
          id: string;
          subject: string;
          body?: { content: string };
          start: { dateTime: string };
          end: { dateTime: string };
          lastModifiedDateTime: string;
          isCancelled?: boolean;
          transactionId?: string;
        }[];
        "@odata.nextLink"?: string;
      }>(provider, token, path);
      for (const e of result.value || [])
        all.push({
          id: e.id,
          title: e.subject || "Evento",
          description: (e.body?.content || "")
            .replace(/<[^>]*>/g, "")
            .slice(0, 10000),
          start: utc(e.start.dateTime),
          end: utc(e.end.dateTime),
          updated: e.lastModifiedDateTime,
          cancelled: Boolean(e.isCancelled),
          hubId: e.transactionId,
        });
      const next = result["@odata.nextLink"];
      if (next) {
        const u = new URL(next);
        if (
          u.origin !== new URL(graph).origin ||
          !u.pathname.startsWith("/v1.0/")
        )
          throw new Error("Unexpected provider pagination");
        page = u.pathname.slice("/v1.0".length) + u.search;
      } else page = undefined;
    }
  } while (page);
  return all;
}
export async function saveExternalEvent(
  provider: CalendarProvider,
  token: ProviderToken,
  calendarId: string,
  event: {
    id: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    cancelled_at: string | null;
  },
  externalId?: string,
  etag?: string,
): Promise<{ id: string; updated: string }> {
  const root =
    provider === "google"
      ? `/calendars/${encodeURIComponent(calendarId)}/events`
      : `/me/calendars/${encodeURIComponent(calendarId)}/events`;
  if (event.cancelled_at && externalId) {
    if (provider === "google") {
      await api(provider, token, root + "/" + encodeURIComponent(externalId), {
        method: "PATCH",
        body: { status: "cancelled" },
        allowGone: true,
        etag,
      });
    } else {
      await api(provider, token, root + "/" + encodeURIComponent(externalId), {
        method: "DELETE",
        allowGone: true,
        etag,
      });
    }
    return { id: externalId, updated: new Date().toISOString() };
  }
  const id = "hub" + event.id.replaceAll("-", "");
  if (provider === "google") {
    const result = await api<{ id: string; updated: string }>(
      provider,
      token,
      root +
        (externalId ? "/" + encodeURIComponent(externalId) : "") +
        "?sendUpdates=none",
      {
        method: externalId ? "PATCH" : "POST",
        allowConflict: !externalId,
        etag,
        body: {
          ...(!externalId ? { id } : {}),
          summary: event.title,
          description: event.description,
          start: { dateTime: event.starts_at },
          end: { dateTime: event.ends_at },
          extendedProperties: { private: { hubEventId: event.id } },
        },
      },
    );
    if (!result)
      return api<{ id: string; updated: string }>(
        provider,
        token,
        root + "/" + id,
      );
    return result;
  }
  const result = await api<{ id: string; lastModifiedDateTime: string }>(
    provider,
    token,
    root + (externalId ? "/" + encodeURIComponent(externalId) : ""),
    {
      method: externalId ? "PATCH" : "POST",
      etag,
      body: {
        subject: event.title,
        body: { contentType: "text", content: event.description },
        start: { dateTime: event.starts_at.replace(/Z$/, ""), timeZone: "UTC" },
        end: { dateTime: event.ends_at.replace(/Z$/, ""), timeZone: "UTC" },
        ...(!externalId ? { transactionId: event.id } : {}),
      },
    },
  );
  return { id: result.id, updated: result.lastModifiedDateTime };
}

export async function existingCalendar(
  provider: CalendarProvider,
  token: ProviderToken,
  id: string,
) {
  const result = await api<{ id: string }>(
    provider,
    token,
    provider === "google"
      ? `/calendars/${encodeURIComponent(id)}`
      : `/me/calendars/${encodeURIComponent(id)}`,
    { allowGone: true },
  );
  return Boolean(result);
}
export async function readExternalEvent(
  provider: CalendarProvider,
  token: ProviderToken,
  calendarId: string,
  eventId: string,
): Promise<ExternalEvent | null> {
  type Raw = {
    id: string;
    summary?: string;
    subject?: string;
    description?: string;
    body?: { content: string };
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    updated?: string;
    lastModifiedDateTime?: string;
    status?: string;
    isCancelled?: boolean;
    etag?: string;
    "@odata.etag"?: string;
    transactionId?: string;
    extendedProperties?: { private?: { hubEventId?: string } };
  };
  const root =
    provider === "google"
      ? `/calendars/${encodeURIComponent(calendarId)}/events`
      : `/me/calendars/${encodeURIComponent(calendarId)}/events`;
  const raw = await api<Raw>(
    provider,
    token,
    root + "/" + encodeURIComponent(eventId),
    { allowGone: true },
  );
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.summary || raw.subject || "Evento",
    description:
      raw.description || (raw.body?.content || "").replace(/<[^>]*>/g, ""),
    start: utc(raw.start?.dateTime || raw.start?.date + "T00:00:00"),
    end: utc(raw.end?.dateTime || raw.end?.date + "T00:00:00"),
    updated: raw.updated || raw.lastModifiedDateTime || "",
    cancelled: raw.status === "cancelled" || Boolean(raw.isCancelled),
    hubId: raw.extendedProperties?.private?.hubEventId || raw.transactionId,
    etag: raw.etag || raw["@odata.etag"],
  };
}
export async function subscribeCalendar(
  provider: CalendarProvider,
  token: ProviderToken,
  calendarId: string,
  channelToken: string,
  subscriptionId: string,
  callback: string,
) {
  if (provider === "google") {
    const result = await api<{
      id: string;
      resourceId: string;
      expiration: string;
    }>(
      provider,
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: "POST",
        body: {
          id: subscriptionId,
          type: "web_hook",
          address: callback,
          token: channelToken,
          expiration: String(Date.now() + 6 * 86400000),
        },
      },
    );
    return {
      subscription_id: result.id,
      resource_id: result.resourceId,
      expires_at: new Date(Number(result.expiration)).toISOString(),
    };
  }
  const result = await api<{ id: string; expirationDateTime: string }>(
    provider,
    token,
    "/subscriptions",
    {
      method: "POST",
      body: {
        changeType: "created,updated,deleted",
        notificationUrl: callback,
        resource: "/me/events",
        expirationDateTime: new Date(Date.now() + 2 * 86400000).toISOString(),
        clientState: channelToken,
      },
    },
  );
  return {
    subscription_id: result.id,
    resource_id: null,
    expires_at: result.expirationDateTime,
  };
}
export async function stopCalendarSubscription(
  provider: CalendarProvider,
  token: ProviderToken,
  subscriptionId: string,
  resourceId: string | null,
) {
  if (provider === "google") {
    if (resourceId)
      await api(provider, token, "/channels/stop", {
        method: "POST",
        body: { id: subscriptionId, resourceId },
        allowGone: true,
      });
  } else
    await api(
      provider,
      token,
      "/subscriptions/" + encodeURIComponent(subscriptionId),
      { method: "DELETE", allowGone: true },
    );
}
