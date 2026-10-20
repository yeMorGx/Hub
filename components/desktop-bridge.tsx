"use client";
import { useEffect, useRef } from "react";
import type { HubController } from "@/lib/hub/use-hub";
function isDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
export function DesktopBridge({ hub }: { hub: HubController }) {
  const latest = useRef(hub);
  latest.current = hub;
  useEffect(() => {
    if (!isDesktop()) return;
    let stop: (() => void) | undefined,
      disposed = false,
      changing = false;
    void import("@tauri-apps/api/event").then(async ({ listen }) => {
      const cleanup = await listen("hub-toggle-timer", async () => {
        const current = latest.current;
        if (
          changing ||
          current.busy ||
          !current.canParticipate ||
          !current.teamId
        )
          return;
        changing = true;
        try {
          const { data, error } = await current.client
            .from("time_entries")
            .select("id")
            .eq("user_id", current.userId)
            .is("ended_at", null)
            .maybeSingle();
          if (error) throw error;
          await current.mutate(
            () =>
              data
                ? current.rpc("stop_timer", { p_entry_id: data.id })
                : current.rpc("start_timer", {
                    p_team_id: current.teamId,
                    p_description: "Trabalho com o time",
                  }),
            data ? "Timer encerrado." : "Timer iniciado.",
          );
        } catch {
          current.notify("Não foi possível alterar o timer pelo atalho.", true);
        } finally {
          changing = false;
        }
      });
      if (disposed) cleanup();
      else stop = cleanup;
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, []);
  const unread = Object.values(hub.snapshot.unread).reduce(
    (sum, n) => sum + n,
    0,
  );
  useEffect(() => {
    if (!isDesktop()) return;
    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().setBadgeCount(unread || undefined),
      )
      .catch(() => {});
    return () => {
      void import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) =>
          getCurrentWindow().setBadgeCount(undefined),
        )
        .catch(() => {});
    };
  }, [unread]);
  useEffect(() => {
    document.title = unread
      ? `(${unread > 99 ? "99+" : unread}) Hub — Seu time, conectado`
      : "Hub — Seu time, conectado";
    return () => {
      document.title = "Hub — Seu time, conectado";
    };
  }, [unread]);
  return null;
}
