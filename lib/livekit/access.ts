import "server-only";
import { RoomServiceClient } from "livekit-server-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { removeDisallowedParticipants } from "./permissions";
export async function enforceRoomAccess(
  client: SupabaseClient<Database>,
  channelId: string,
  teamId: string,
) {
  const allowed = new Set<string>();
  for (let offset = 0; offset < 10000; offset += 500) {
    const result = await client
      .rpc("call_channel_roster", { p_channel_id: channelId })
      .range(offset, offset + 499);
    if (result.error) throw new Error("Canal indisponível.");
    for (const p of result.data) allowed.add(p.user_id);
    if (result.data.length < 500) break;
    if (offset === 9500) throw new Error("Sala indisponível.");
  }
  const url = new URL(process.env.LIVEKIT_URL!);
  if (url.protocol === "wss:") url.protocol = "https:";
  if (url.protocol === "ws:") url.protocol = "http:";
  const service = new RoomServiceClient(
    url.origin,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  );
  return removeDisallowedParticipants(
    service,
    `hub:${teamId}:${channelId}`,
    allowed,
  );
}
