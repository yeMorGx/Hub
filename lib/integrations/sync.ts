import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Row } from "@/lib/hub/types";
import type { CalendarProvider } from "./config";
import { seal, unseal } from "./crypto";
import {
  listExternalEvents,
  readExternalEvent,
  refreshToken,
  saveExternalEvent,
  type ExternalEvent,
} from "./provider";
import type { CalendarSecret } from "./session";
export type SyncConflict = { eventId: string; title: string; reason: string };
export async function syncCalendar(
  client: SupabaseClient<Database>,
  userId: string,
  connectionId: string,
  provider: CalendarProvider,
  from: string,
  to: string,
  resolutions: Record<string, "hub" | "external"> = {},
) {
  const connectionResult = await client
    .from("calendar_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  if (connectionResult.error || !connectionResult.data)
    throw new Error("Conexão indisponível.");
  const connection = connectionResult.data;
  const claim = await client.rpc("claim_calendar_sync", {
    p_connection_id: connectionId,
  });
  if (claim.error) throw new Error("Há outra sincronização em andamento.");
  let completed = false;
  try {
    const encrypted = await client.rpc("calendar_connection_secret", {
      p_connection_id: connectionId,
    });
    if (encrypted.error || !encrypted.data)
      throw new Error("Reconecte o calendário.");
    const secret = unseal<CalendarSecret>(encrypted.data);
    if (
      secret.userId !== userId ||
      secret.teamId !== connection.team_id ||
      secret.provider !== provider ||
      secret.calendarId !== connection.calendar_id
    )
      throw new Error("Conexão inválida.");
    const token = await refreshToken(provider, secret);
    if (token !== secret) {
      const saved = await client.rpc("save_calendar_connection", {
        p_team_id: connection.team_id,
        p_provider: provider,
        p_calendar_id: secret.calendarId,
        p_ciphertext: seal({ ...secret, ...token }),
      });
      if (saved.error) throw new Error("Não foi possível renovar a conexão.");
    }
    const [eventsResult, linksResult, external] = await Promise.all([
      client
        .from("events")
        .select("*")
        .eq("team_id", connection.team_id)
        .gte("ends_at", from)
        .lt("starts_at", to)
        .limit(1001),
      client
        .from("calendar_event_links")
        .select("*")
        .eq("connection_id", connectionId)
        .limit(1001),
      listExternalEvents(provider, token, secret.calendarId, from, to),
    ]);
    if (eventsResult.error || linksResult.error)
      throw new Error("Não foi possível consultar o calendário.");
    if (eventsResult.data.length >= 1000 || linksResult.data.length >= 1000)
      throw new Error(
        "A conexão atingiu o limite de consulta (1.000 registros). Revise os vínculos antes de continuar.",
      );
    const events = new Map(eventsResult.data.map((e) => [e.id, e])),
      links = linksResult.data,
      byExternal = new Map(links.map((l) => [l.external_id, l]));
    // Include mapped events moved outside the selected period. Absence from a range is never deletion.
    // Only fetch mapped Hub events moved outside the interval when their provider
    // event is actually in this interval. Historical links must not trigger thousands
    // of out-of-range provider requests or be mistaken for deletions.
    const externalIds = new Set(external.map((item) => item.id));
    const absent = links.filter(
      (link) => !events.has(link.event_id) && externalIds.has(link.external_id),
    );
    for (let offset = 0; offset < absent.length; offset += 100) {
      const result = await client
        .from("events")
        .select("*")
        .eq("team_id", connection.team_id)
        .in(
          "id",
          absent.slice(offset, offset + 100).map((link) => link.event_id),
        );
      if (result.error) throw new Error("Falha ao consultar vínculos.");
      for (const event of result.data || []) events.set(event.id, event);
    }
    let processed = 0,
      more = false;
    const conflicts: SyncConflict[] = [];
    const handled = new Set<string>();
    async function remember(
      event: Row<"events">,
      item: { id: string; updated: string },
    ) {
      const result = await client.rpc("save_calendar_event_link", {
        p_connection_id: connectionId,
        p_event_id: event.id,
        p_external_id: item.id,
        p_external_updated_at: item.updated,
        p_hub_updated_at: event.updated_at,
      });
      if (result.error) throw new Error("Falha ao salvar vínculo.");
    }
    async function importEvent(item: ExternalEvent, event?: Row<"events">) {
      if (item.cancelled && !event) return;
      const result = await client.rpc("apply_calendar_event", {
        p_connection_id: connectionId,
        p_title: item.title.slice(0, 200),
        p_description: item.description.slice(0, 10000),
        p_starts_at: item.cancelled && event ? event.starts_at : item.start,
        p_ends_at: item.cancelled && event ? event.ends_at : item.end,
        p_event_id: event?.id,
        p_expected_updated_at: event?.updated_at,
        p_cancelled: item.cancelled,
      });
      if (result.error)
        throw new Error("O evento mudou ou você não pode editá-lo.");
      const saved = await client
        .from("events")
        .select("*")
        .eq("id", result.data)
        .single();
      if (saved.error) throw new Error("Falha ao consultar evento atualizado.");
      await remember(saved.data, item);
    }
    for (const link of links) {
      const event = events.get(link.event_id);
      if (!event) continue;
      handled.add(event.id);
      const listed = external.find((e) => e.id === link.external_id);
      const hubChanged = event.updated_at !== link.hub_updated_at;
      const externalChanged = listed
        ? listed.updated !== link.external_updated_at
        : true;
      if (
        !hubChanged &&
        (!externalChanged ||
          (!listed &&
            link.external_updated_at === "deleted" &&
            event.cancelled_at))
      )
        continue;
      if (processed >= 15) {
        more = true;
        continue;
      }
      try {
        const current = await readExternalEvent(
          provider,
          token,
          secret.calendarId,
          link.external_id,
        );
        const item = current || {
          id: link.external_id,
          title: event.title,
          description: event.description,
          start: event.starts_at,
          end: event.ends_at,
          updated: "deleted",
          cancelled: true,
        };
        const remoteChanged = item.updated !== link.external_updated_at;
        if (hubChanged && remoteChanged && !resolutions[event.id]) {
          conflicts.push({
            eventId: event.id,
            title: event.title,
            reason: "Alterado nos dois calendários.",
          });
          continue;
        }
        if (hubChanged && (!remoteChanged || resolutions[event.id] === "hub")) {
          // A deleted provider event must be recreated, never PATCHed blindly.
          const saved =
            event.cancelled_at && !current
              ? { id: link.external_id, updated: "deleted" }
              : await saveExternalEvent(
                  provider,
                  token,
                  secret.calendarId,
                  event,
                  current?.id,
                  current?.etag,
                );
          await remember(event, saved);
        } else if (remoteChanged) await importEvent(item, event);
        else continue;
        processed++;
      } catch {
        conflicts.push({
          eventId: event.id,
          title: event.title,
          reason:
            "Não foi possível aplicar. Atualize o calendário e tente novamente.",
        });
      }
    }
    for (const item of external) {
      if (byExternal.has(item.id) || item.cancelled) continue;
      if (processed >= 15) {
        more = true;
        continue;
      }
      try {
        const candidate = item.hubId ? events.get(item.hubId) : undefined;
        if (candidate) {
          if (!links.some((l) => l.event_id === candidate.id)) {
            await remember(candidate, item);
            handled.add(candidate.id);
            processed++;
          }
          continue;
        }
        await importEvent(item);
        processed++;
      } catch {
        conflicts.push({
          eventId: item.id,
          title: item.title,
          reason:
            "Importação indisponível. Confira os campos e suas permissões.",
        });
      }
    }
    for (const event of events.values()) {
      if (
        handled.has(event.id) ||
        links.some((l) => l.event_id === event.id) ||
        event.cancelled_at
      )
        continue;
      if (processed >= 15) {
        more = true;
        continue;
      }
      try {
        const saved = await saveExternalEvent(
          provider,
          token,
          secret.calendarId,
          event,
        );
        await remember(event, saved);
        processed++;
      } catch {
        conflicts.push({
          eventId: event.id,
          title: event.title,
          reason: "Não foi possível exportar este evento.",
        });
      }
    }
    const completion = await client.rpc("complete_calendar_sync", {
      p_connection_id: connectionId,
      p_token: claim.data,
    });
    if (completion.error)
      throw new Error("Não foi possível registrar a sincronização concluída.");
    completed = true;
    return { processed, more, conflicts };
  } finally {
    if (!completed)
      await client.rpc("release_calendar_sync", {
        p_connection_id: connectionId,
        p_token: claim.data,
      });
  }
}
