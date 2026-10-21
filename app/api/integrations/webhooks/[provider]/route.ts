import { after } from "next/server";
import { isProvider } from "@/lib/integrations/config";
import { equalState } from "@/lib/integrations/crypto";
import {
  backgroundConfigured,
  backgroundOperation,
  processCalendarJobs,
  tokenHash,
} from "@/lib/integrations/background";
export const maxDuration = 60;
const respond = (status: number) =>
  new Response(null, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isProvider(provider)) return respond(404);
  const validation = new URL(request.url).searchParams.get("validationToken");
  if (provider === "outlook" && validation && validation.length <= 2000)
    return new Response(validation, {
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  if (!backgroundConfigured()) return respond(503);
  try {
    let notices: {
      subscriptionId: string;
      token: string;
      resourceId?: string;
    }[] = [];
    if (provider === "google")
      notices = [
        {
          subscriptionId: request.headers.get("x-goog-channel-id") || "",
          token: request.headers.get("x-goog-channel-token") || "",
          resourceId: request.headers.get("x-goog-resource-id") || "",
        },
      ];
    else {
      const raw = await request.text();
      if (raw.length > 64000) return respond(413);
      const input = JSON.parse(raw);
      if (!Array.isArray(input.value) || input.value.length > 100)
        return respond(400);
      notices = input.value.map(
        (n: { subscriptionId: string; clientState: string }) => ({
          subscriptionId: n.subscriptionId,
          token: n.clientState,
        }),
      );
    }
    const queued = new Set<string>();
    for (const notice of notices) {
      if (
        typeof notice.subscriptionId !== "string" ||
        notice.subscriptionId.length > 1000 ||
        typeof notice.token !== "string" ||
        notice.token.length > 256
      )
        continue;
      const watch = (await backgroundOperation("find_watch", undefined, {
        subscription_id: notice.subscriptionId,
      })) as {
        connection_id: string;
        provider: string;
        token_hash: string;
        resource_id: string | null;
      } | null;
      if (
        !watch ||
        watch.provider !== provider ||
        !equalState(tokenHash(notice.token), watch.token_hash) ||
        (provider === "google" && notice.resourceId !== watch.resource_id)
      )
        continue;
      if (!queued.has(watch.connection_id)) {
        await backgroundOperation("queue", watch.connection_id);
        queued.add(watch.connection_id);
      }
    }
    if (queued.size)
      after(async () => {
        await processCalendarJobs([...queued][0]).catch(() => {});
      });
    return respond(202);
  } catch {
    return respond(400);
  }
}
