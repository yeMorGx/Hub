"use client";
import { useEffect, useRef } from "react";
import {
  syncDesktopTimer,
  quickTimerAction,
  isDesktopRuntime,
} from "@/lib/desktop/runtime";
import { setDesktopUnread } from "@/lib/desktop/badge";
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
          const paused = await current.client
            .from("paused_timers")
            .select("user_id")
            .eq("user_id", current.userId)
            .maybeSingle();
          if (paused.error) throw paused.error;
          await current.mutate(
            () =>
              data
                ? current.rpc("stop_timer", { p_entry_id: data.id })
                : paused.data
                  ? current.rpc("resume_timer", {})
                  : current.rpc("start_timer", {
                      p_team_id: current.teamId,
                      p_description: "Trabalho com o time",
                    }),
            data
              ? "Timer encerrado."
              : paused.data
                ? "Trabalho retomado."
                : "Timer iniciado.",
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
  useEffect(() => {
    if (!isDesktopRuntime()) return;
    void syncDesktopTimer(hub).catch(() => {});
  }, [hub.snapshot, hub.busy, hub.teamId, hub.userId, hub.canParticipate]);
  useEffect(() => {
    if (!isDesktopRuntime()) return;
    let disposed = false,
      changing = false,
      stop: (() => void) | undefined;
    void import("@tauri-apps/api/event")
      .then(async ({ listen }) => {
        const cleanup = await listen<string>(
          "zulu:mini-action",
          async (event) => {
            if (
              !["pause", "resume", "stop"].includes(event.payload) ||
              changing
            )
              return;
            const current = latest.current;
            if (current.busy) return;
            changing = true;
            try {
              const result = await current.mutate(
                () =>
                  quickTimerAction(
                    current,
                    event.payload as "pause" | "resume" | "stop",
                  ),
                event.payload === "pause"
                  ? "Timer pausado para o almoço."
                  : event.payload === "resume"
                    ? "Trabalho retomado."
                    : "Atividade salva.",
              );
              const { invoke } = await import("@tauri-apps/api/core");
              await invoke("desktop_timer_feedback", {
                error: result.ok
                  ? null
                  : (result.error ?? "Não foi possível alterar o timer."),
              }).catch(() => {});
            } finally {
              changing = false;
              void syncDesktopTimer(latest.current).catch(() => {});
            }
          },
        );
        if (disposed) cleanup();
        else stop = cleanup;
      })
      .catch(() => {});
    return () => {
      disposed = true;
      stop?.();
      void import("@tauri-apps/api/core")
        .then(({ invoke }) =>
          invoke("desktop_timer_sync", {
            timer: {
              phase: "idle",
              elapsedSeconds: 0,
              canControl: false,
              busy: false,
            },
          }),
        )
        .catch(() => {});
    };
  }, []);
  const unread = Object.values(hub.snapshot.unread).reduce(
    (sum, n) => sum + n,
    0,
  );
  const badgeQueue = useRef(Promise.resolve());
  useEffect(() => {
    if (!isDesktop()) return;
    badgeQueue.current = badgeQueue.current
      .then(() => setDesktopUnread(unread))
      .catch(() => {});
  }, [unread]);
  useEffect(
    () => () => {
      if (!isDesktop()) return;
      badgeQueue.current = badgeQueue.current
        .then(() => setDesktopUnread(0))
        .catch(() => {});
    },
    [],
  );
  useEffect(() => {
    document.title = unread
      ? `(${unread > 99 ? "99+" : unread}) ZULU — Seu time, conectado`
      : "ZULU — Seu time, conectado";
    return () => {
      document.title = "ZULU — Seu time, conectado";
    };
  }, [unread]);
  return null;
}
