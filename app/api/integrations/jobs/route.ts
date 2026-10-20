import { equalState } from "@/lib/integrations/crypto";
import { integrationJson } from "@/lib/integrations/session";
import {
  backgroundConfigured,
  processCalendarJobs,
  renewCalendarWatches,
} from "@/lib/integrations/background";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (
    !expected ||
    !equalState(
      request.headers.get("Authorization") || "",
      `Bearer ${expected}`,
    )
  )
    return integrationJson({ error: "Unauthorized" }, 401);
  if (!backgroundConfigured())
    return integrationJson({ error: "Background sync is not configured" }, 503);
  try {
    const result = await processCalendarJobs();
    await renewCalendarWatches();
    return integrationJson(result);
  } catch {
    return integrationJson({ error: "Job interrupted" }, 500);
  }
}
