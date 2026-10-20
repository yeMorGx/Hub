"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
import type { Database } from "@/lib/supabase/database.types";
import {
  EMPTY_TEAM,
  type Bootstrap,
  type Person,
  type TeamSnapshot,
  type Row,
} from "./types";

type Functions = Database["public"]["Functions"];
function rows<T>(response: { data: T[] | null; error: unknown }): T[] {
  if (response.error) throw response.error;
  return response.data ?? [];
}
export function useHub(
  userId: string,
  rangeStart: string,
  rangeEnd: string,
  todayKey: string,
) {
  const client = createClient();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null),
    [bootLoading, setBootLoading] = useState(true),
    [bootError, setBootError] = useState("");
  const [teamId, setTeamIdState] = useState(""),
    [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null),
    [teamError, setTeamError] = useState(""),
    [teamLoading, setTeamLoading] = useState(false);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{ message: string; error: boolean } | null>(
      null,
    ),
    [connection, setConnection] = useState<
      "connecting" | "live" | "degraded" | "offline"
    >("connecting");
  const [presenceReady, setPresenceReady] = useState<
    "connecting" | "live" | "unavailable"
  >("connecting");
  const [onlinePeople, setOnlinePeople] = useState<Record<string, string>>({}),
    [availability, setAvailability] = useState("online");
  const generation = useRef(0),
    teamGeneration = useRef(0),
    mutationLock = useRef(false),
    mounted = useRef(true),
    availabilityRef = useRef(availability);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      teamGeneration.current++;
    };
  }, []);
  useEffect(() => {
    availabilityRef.current = availability;
  }, [availability]);
  const notify = useCallback(
    (message: string, error = false) => setNotice({ message, error }),
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(
      () => setNotice(null),
      notice.error ? 8000 : 4500,
    );
    return () => clearTimeout(timeout);
  }, [notice]);
  const refreshBootstrap = useCallback(async () => {
    const serial = ++generation.current;
    try {
      const { data: identity, error: identityError } =
        await client.auth.getClaims();
      if (identityError || !identity?.claims.sub) {
        setSnapshot(null);
        setBootstrap(null);
        window.location.replace("/login");
        return;
      }
      if (identity.claims.sub !== userId) {
        setSnapshot(null);
        setBootstrap(null);
        window.location.reload();
        return;
      }
      if (identity.claims.aal !== "aal2") {
        setSnapshot(null);
        setBootstrap(null);
        window.location.replace("/mfa");
        return;
      }
      const [
        profile,
        workspaces,
        teams,
        workspaceMemberships,
        teamMemberships,
      ] = await Promise.all([
        client.from("profiles").select("*").eq("id", userId).single(),
        client.from("workspaces").select("*").order("name"),
        client.from("teams").select("*").order("name"),
        client.from("workspace_members").select("*").eq("user_id", userId),
        client.from("team_members").select("*").eq("user_id", userId),
      ]);
      if (profile.error) throw profile.error;
      const result: Bootstrap = {
        profile: profile.data,
        workspaces: rows(workspaces),
        teams: rows(teams),
        workspaceMemberships: rows(workspaceMemberships),
        teamMemberships: rows(teamMemberships),
      };
      if (!mounted.current || serial !== generation.current) return;
      setBootstrap(result);
      setBootError("");
      let preferred = "";
      try {
        preferred = localStorage.getItem(`hub.team.${userId}`) ?? "";
      } catch {}
      setTeamIdState((current) =>
        result.teams.some((t) => t.id === current)
          ? current
          : (result.teams.find((t) => t.id === preferred)?.id ??
            result.teams.find((t) =>
              result.teamMemberships.some(
                (m) => m.team_id === t.id && m.is_active,
              ),
            )?.id ??
            result.teams[0]?.id ??
            ""),
      );
    } catch (error) {
      if (mounted.current && serial === generation.current) {
        setBootstrap(null);
        setSnapshot(null);
        setBootError(errorMessage(error));
      }
    } finally {
      if (mounted.current && serial === generation.current)
        setBootLoading(false);
    }
  }, [client, userId]);
  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);
  const setTeamId = useCallback(
    (id: string) => {
      setTeamIdState(id);
      setSnapshot(null);
      setOnlinePeople({});
      try {
        localStorage.setItem(`hub.team.${userId}`, id);
      } catch {}
    },
    [userId],
  );
  const refreshTeam = useCallback(async () => {
    if (!teamId) return;
    const serial = ++teamGeneration.current;
    setTeamLoading(true);
    try {
      const todayStart = new Date(`${todayKey}T00:00:00`);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const todayInsideRange =
        todayStart.toISOString() >= rangeStart &&
        todayEnd.toISOString() <= rangeEnd;
      const loadTasks = async () => {
        const tasks: Row<"tasks">[] = [];
        let cursor = "";
        while (mounted.current && serial === teamGeneration.current) {
          let query = client
            .from("tasks")
            .select("*")
            .eq("team_id", teamId)
            .is("archived_at", null)
            .order("id")
            .limit(500);
          if (cursor) query = query.gt("id", cursor);
          const page = rows(await query);
          tasks.push(...page);
          if (page.length < 500) break;
          cursor = page[page.length - 1].id;
        }
        return tasks;
      };
      const [
        taskRows,
        members,
        projects,
        channels,
        channelMemberships,
        entries,
        activeTimers,
        events,
        todayEvents,
        unread,
      ] = await Promise.all([
        loadTasks(),
        client
          .from("team_members")
          .select("*")
          .eq("team_id", teamId)
          .eq("is_active", true),
        client
          .from("projects")
          .select("*")
          .eq("team_id", teamId)
          .is("archived_at", null)
          .order("name"),
        client
          .from("channels")
          .select("*")
          .eq("team_id", teamId)
          .is("archived_at", null)
          .order("created_at"),
        client
          .from("channel_members")
          .select("*")
          .eq("team_id", teamId)
          .eq("user_id", userId),
        client
          .from("time_entries")
          .select("*")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(500),
        client
          .from("time_entries")
          .select("*")
          .eq("user_id", userId)
          .is("ended_at", null)
          .limit(1),
        client
          .from("events")
          .select("*")
          .eq("team_id", teamId)
          .is("cancelled_at", null)
          .gte("ends_at", rangeStart)
          .lt("starts_at", rangeEnd)
          .order("starts_at")
          .limit(500),
        todayInsideRange
          ? Promise.resolve({ data: [], error: null })
          : client
              .from("events")
              .select("*")
              .eq("team_id", teamId)
              .is("cancelled_at", null)
              .gt("ends_at", todayStart.toISOString())
              .lt("starts_at", todayEnd.toISOString())
              .order("starts_at")
              .limit(500),
        client
          .from("channel_unread_counts")
          .select("*")
          .eq("team_id", teamId)
          .eq("user_id", userId),
      ]);
      const memberRows = rows(members),
        projectRows = rows(projects),
        channelRows = rows(channels),
        membershipRows = rows(channelMemberships),
        entryRows = [
          ...new Map(
            [...rows(entries), ...rows(activeTimers)].map((e) => [e.id, e]),
          ).values(),
        ],
        eventRows = [
          ...new Map(
            [...rows(events), ...rows(todayEvents)].map((event) => [
              event.id,
              event,
            ]),
          ).values(),
        ].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
        unreadRows = rows(unread);
      const userIds = [
        ...new Set([userId, ...memberRows.map((m) => m.user_id)]),
      ];
      const profileBatches = Array.from(
        { length: Math.ceil(userIds.length / 100) },
        (_, index) => userIds.slice(index * 100, (index + 1) * 100),
      );
      const eventBatches = Array.from(
        { length: Math.ceil(eventRows.length / 100) },
        (_, index) =>
          eventRows
            .slice(index * 100, (index + 1) * 100)
            .map((event) => event.id),
      );
      const [profiles, statuses, attendees] = await Promise.all([
        Promise.all(
          profileBatches.map((ids) =>
            client.from("profiles").select("*").in("id", ids),
          ),
        ),
        client.from("member_statuses").select("*").eq("team_id", teamId),
        Promise.all(
          eventBatches.map((ids) =>
            client.from("event_attendees").select("*").in("event_id", ids),
          ),
        ),
      ]);
      const profileRows = profiles.flatMap((response) => rows(response)),
        statusRows = rows(statuses),
        attendeeRows = attendees.flatMap((response) => rows(response));
      const people: Person[] = memberRows.flatMap((member) => {
        const profile = profileRows.find((p) => p.id === member.user_id);
        if (!profile) return [];
        const status = statusRows.find((s) => s.user_id === profile.id);
        return [
          {
            ...profile,
            role: member.role,
            body:
              status &&
              (!status.expires_at ||
                new Date(status.expires_at).getTime() > Date.now())
                ? status.body
                : "",
            timer_running: status?.timer_running ?? false,
          },
        ];
      });
      if (!mounted.current || serial !== teamGeneration.current) return;
      setSnapshot({
        teamId,
        people,
        projects: projectRows,
        tasks: taskRows,
        channels: channelRows,
        channelMemberships: membershipRows,
        entries: entryRows,
        events: eventRows,
        attendees: attendeeRows,
        unread: Object.fromEntries(
          unreadRows
            .filter((r) => r.channel_id)
            .map((r) => [r.channel_id!, Number(r.unread_count ?? 0)]),
        ),
      });
      setTeamError("");
    } catch (error) {
      if (mounted.current && serial === teamGeneration.current) {
        setSnapshot(null);
        setTeamError(errorMessage(error));
      }
    } finally {
      if (mounted.current && serial === teamGeneration.current)
        setTeamLoading(false);
    }
  }, [client, teamId, userId, rangeStart, rangeEnd, todayKey]);
  useEffect(() => {
    setSnapshot(null);
    setTeamError("");
    if (teamId) void refreshTeam();
    return () => {
      teamGeneration.current++;
    };
  }, [teamId, refreshTeam]);
  const refreshAll = useCallback(async () => {
    await refreshBootstrap();
    await refreshTeam();
  }, [refreshBootstrap, refreshTeam]);
  const ownMembership = bootstrap?.teamMemberships.find(
    (m) => m.team_id === teamId && m.is_active,
  );
  const teamChannel = useRef<ReturnType<typeof client.channel> | null>(null);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setOnlinePeople({});
    setPresenceReady(ownMembership ? "connecting" : "unavailable");
    setConnection(
      navigator.onLine
        ? teamId && ownMembership
          ? "connecting"
          : "degraded"
        : "offline",
    );
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refreshAll(), 180);
    };
    // All subscriptions are private and use the exact topics authorized by RLS.
    // Admins outside the team have read access through RLS and periodic queries,
    // but cannot join a presence room or gain participation by subscribing.
    const channel =
      teamId && ownMembership
        ? client.channel(`team:${teamId}:presence`, {
            config: { private: true, presence: { key: userId } },
          })
        : null;
    const track = () => {
      if (channel?.state === "joined")
        void channel.track({
          user_id: userId,
          availability: document.hidden ? "away" : availabilityRef.current,
          online_at: new Date().toISOString(),
        });
    };
    if (channel) {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workspace_members",
            filter: `user_id=eq.${userId}`,
          },
          reload,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_members",
            filter: `user_id=eq.${userId}`,
          },
          reload,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "time_entries",
            filter: `user_id=eq.${userId}`,
          },
          reload,
        );
      for (const table of [
        "projects",
        "tasks",
        "channels",
        "member_statuses",
        "events",
        "event_attendees",
        "messages",
        "team_members",
      ] as const) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `team_id=eq.${teamId}`,
          },
          reload,
        );
      }
      channel
        .on("presence", { event: "sync" }, () => {
          if (!active) return;
          const state = channel.presenceState<{
            user_id: string;
            availability: string;
          }>();
          const online: Record<string, string> = {};
          for (const [id, metas] of Object.entries(state)) {
            const entry = metas[metas.length - 1];
            if (
              entry &&
              ["online", "away", "meeting"].includes(entry.availability)
            )
              online[id] = entry.availability;
          }
          setOnlinePeople(online);
        })
        .subscribe((status) => {
          if (!active) return;
          if (status === "SUBSCRIBED") {
            setConnection("live");
            setPresenceReady("live");
            track();
            reload();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnection(navigator.onLine ? "degraded" : "offline");
            setPresenceReady("unavailable");
            setOnlinePeople({});
          }
        });
      teamChannel.current = channel;
    }
    const poll = setInterval(() => {
      if (!document.hidden) void refreshAll();
    }, 30000);
    const pulse = setInterval(() => {
      track();
      if (ownMembership) void client.rpc("touch_last_seen");
    }, 60000);
    if (ownMembership) void client.rpc("touch_last_seen");
    const reconnect = () => {
      if (!navigator.onLine) {
        setConnection("offline");
        setOnlinePeople({});
      } else {
        setConnection(channel ? "connecting" : "degraded");
        void refreshAll();
        track();
      }
    };
    const focus = () => {
      track();
      if (!document.hidden) void refreshAll();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", reconnect);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(poll);
      clearInterval(pulse);
      teamChannel.current = null;
      if (channel) void client.removeChannel(channel);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", reconnect);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [client, teamId, userId, Boolean(ownMembership), refreshAll]);
  useEffect(() => {
    const channel = teamChannel.current;
    if (channel?.state === "joined")
      void channel.track({
        user_id: userId,
        availability: document.hidden ? "away" : availability,
        online_at: new Date().toISOString(),
      });
  }, [availability, userId]);
  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user.id && session.user.id !== userId) {
        generation.current++;
        teamGeneration.current++;
        setSnapshot(null);
        setBootstrap(null);
        window.location.replace("/");
        return;
      }
      if (event === "SIGNED_OUT") {
        generation.current++;
        teamGeneration.current++;
        setSnapshot(null);
        setBootstrap(null);
        window.location.replace("/login");
      }
      if (event === "TOKEN_REFRESHED") {
        setTimeout(() => {
          void client.realtime.setAuth(session?.access_token);
          void refreshBootstrap();
        }, 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [client, refreshBootstrap, userId]);
  const rpc = useCallback(
    async <N extends keyof Functions>(name: N, args: Functions[N]["Args"]) => {
      const { data, error } = await client.rpc(name, args);
      if (error) throw error;
      return data;
    },
    [client],
  );
  async function mutate<T>(
    action: () => Promise<T>,
    success: string,
  ): Promise<{ ok: true; value: T } | { ok: false; error?: string }> {
    if (mutationLock.current)
      return { ok: false, error: "Aguarde a operação atual terminar." };
    mutationLock.current = true;
    setBusy(true);
    try {
      const value = await action();
      notify(success);
      await refreshAll();
      return { ok: true, value };
    } catch (error) {
      notify(errorMessage(error), true);
      return { ok: false, error: errorMessage(error) };
    } finally {
      mutationLock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const currentTeam = bootstrap?.teams.find((t) => t.id === teamId);
  const workspace = bootstrap?.workspaces.find(
    (w) => w.id === currentTeam?.workspace_id,
  );
  const workspaceRole = bootstrap?.workspaceMemberships.find(
    (m) => m.workspace_id === workspace?.id && m.is_active,
  )?.role;
  return {
    client,
    userId,
    bootstrap,
    bootLoading,
    bootError,
    teamId,
    setTeamId,
    snapshot: snapshot?.teamId === teamId ? snapshot : EMPTY_TEAM,
    teamLoading,
    teamError,
    currentTeam,
    workspace,
    isAdmin: workspaceRole === "admin",
    canManage: workspaceRole === "admin" || ownMembership?.role === "leader",
    canParticipate: Boolean(ownMembership),
    busy,
    notice,
    notify,
    dismissNotice: () => setNotice(null),
    connection,
    onlinePeople,
    presenceReady,
    availability,
    setAvailability,
    refreshAll,
    refreshTeam,
    refreshBootstrap,
    rpc,
    mutate,
  };
}
export type HubController = ReturnType<typeof useHub>;
