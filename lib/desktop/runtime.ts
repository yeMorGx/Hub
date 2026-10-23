import type { HubController } from "@/lib/hub/use-hub";
export type RuntimeState = {
  supported: boolean;
  background: boolean;
  autostart: boolean;
  miniVisible: boolean;
};
export type MiniPhase = "idle" | "running" | "lunch";
export type MiniState = {
  error?: string | null;
  phase: MiniPhase;
  elapsedSeconds: number;
  canControl: boolean;
  busy: boolean;
  sampledAt: number;
  description?: string;
  project?: string;
  compact?: boolean;
};
export type MiniAction = "pause" | "resume" | "stop";
export function isDesktopRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
export async function desktopRuntime(
  action: "state" | "set_autostart" | "show_mini" | "hide_mini" | "quit",
  enabled?: boolean,
) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RuntimeState>("desktop_runtime", { action, enabled });
}
export function timerSnapshot(
  hub: Pick<
    HubController,
    "snapshot" | "userId" | "teamId" | "busy" | "canParticipate"
  >,
  now = Date.now(),
) {
  const active = hub.snapshot.entries.find(
    (entry) => entry.user_id === hub.userId && !entry.ended_at,
  );
  const paused =
    hub.snapshot.pausedTimer?.user_id === hub.userId
      ? hub.snapshot.pausedTimer
      : null;
  const session = active ?? paused;
  const seconds = active
    ? Number(active.carried_seconds ?? 0) +
      Math.max(0, Math.floor((now - Date.parse(active.started_at)) / 1000))
    : Number(paused?.accumulated_seconds ?? 0);
  return {
    description: session?.team_id === hub.teamId ? Array.from(session.description || "").slice(0, 200).join("") : "",
    project: session?.team_id === hub.teamId ? Array.from(hub.snapshot.projects.find(project => project.id === session.project_id)?.name || "").slice(0, 120).join("") : "",
    phase: active
      ? ("running" as const)
      : paused
        ? ("lunch" as const)
        : ("idle" as const),
    elapsedSeconds: Number.isFinite(seconds)
      ? Math.min(315_576_000, Math.max(0, Math.floor(seconds)))
      : 0,
    canControl: Boolean(
      session && session.team_id === hub.teamId && hub.canParticipate,
    ),
    busy: hub.busy,
  };
}
export async function syncDesktopTimer(
  hub: Parameters<typeof timerSnapshot>[0],
) {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("desktop_timer_sync", { timer: timerSnapshot(hub) });
}
/** Resolve the authoritative current session before each quick action. RPCs enforce MFA/ownership. */
export async function quickTimerAction(hub: HubController, action: MiniAction) {
  const [active, paused] = await Promise.all([
    hub.client
      .from("time_entries")
      .select("id,team_id")
      .eq("user_id", hub.userId)
      .is("ended_at", null)
      .maybeSingle(),
    hub.client
      .from("paused_timers")
      .select("team_id")
      .eq("user_id", hub.userId)
      .maybeSingle(),
  ]);
  if (active.error) throw active.error;
  if (paused.error) throw paused.error;
  const session = active.data ?? paused.data;
  if (!session || session.team_id !== hub.teamId || !hub.canParticipate)
    throw Error("Abra o time desta atividade no ZULU para controlar o timer.");
  if (action === "pause" && active.data) return hub.rpc("pause_timer", {});
  if (action === "resume" && !active.data && paused.data)
    return hub.rpc("resume_timer", {});
  if (action === "stop")
    return active.data
      ? hub.rpc("stop_timer", { p_entry_id: active.data.id })
      : hub.rpc("stop_paused_timer", {});
  throw Error("O timer mudou. Confira a atividade e tente novamente.");
}
