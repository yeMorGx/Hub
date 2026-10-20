import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Row } from "./types";
// Keyset pagination avoids silently hiding events in busy months.
export async function loadCalendarEvents(
  client: SupabaseClient<Database>,
  teamId: string,
  start: string,
  end: string,
  current: () => boolean = () => true,
) {
  const events: Row<"events">[] = [];
  let cursor = "";
  while (current()) {
    let query = client
      .from("events")
      .select("*")
      .eq("team_id", teamId)
      .is("cancelled_at", null)
      .gt("ends_at", start)
      .lt("starts_at", end)
      .order("id")
      .limit(500);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw error;
    const page = data ?? [];
    events.push(...page);
    if (page.length < 500) break;
    cursor = page[page.length - 1].id;
  }
  return events;
}
