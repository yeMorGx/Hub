"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
import type { Row } from "./types";
export type CollaborationData = {
  teamId: string;
  notes: Row<"team_notes">[];
  standups: Row<"standups">[];
  meetings: Row<"meeting_documents">[];
  notifications: Row<"notifications">[];
};
export function useCollaboration(
  teamId: string,
  enabled: boolean,
  client = createClient(),
) {
  const serial = useRef(0);
  const [data, setData] = useState<CollaborationData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!teamId || !enabled) return;
    const generation = ++serial.current;
    setLoading(true);
    try {
      const reminder = await client.rpc("refresh_my_reminders", {
        p_team_id: teamId,
      });
      if (reminder.error) throw reminder.error;
      const [notes, standups, meetings, notifications] = await Promise.all([
        client
          .from("team_notes")
          .select("*")
          .eq("team_id", teamId)
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(500),
        client
          .from("standups")
          .select("*")
          .eq("team_id", teamId)
          .gte(
            "period_on",
            new Date(Date.now() - 35 * 86400000).toISOString().slice(0, 10),
          )
          .order("period_on", { ascending: false })
          .limit(1000),
        client
          .from("meeting_documents")
          .select("*")
          .eq("team_id", teamId)
          .limit(1000),
        client
          .from("notifications")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      for (const response of [notes, standups, meetings, notifications])
        if (response.error) throw response.error;
      if (generation !== serial.current) return;
      setData({
        teamId,
        notes: notes.data || [],
        standups: standups.data || [],
        meetings: meetings.data || [],
        notifications: notifications.data || [],
      });
      setError("");
    } catch (e) {
      if (generation === serial.current) {
        setData(null);
        setError(errorMessage(e));
      }
    } finally {
      if (generation === serial.current) setLoading(false);
    }
  }, [client, teamId, enabled]);
  useEffect(() => {
    setData(null);
    setError("");
    void refresh();
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 20000);
    const focus = () => void refresh();
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.teamId === teamId && detail.origin === "bell") void refresh();
    };
    window.addEventListener("zulu:notifications-read", changed);
    window.addEventListener("focus", focus);
    return () => {
      serial.current++;
      clearInterval(poll);
      window.removeEventListener("focus", focus);
      window.removeEventListener("zulu:notifications-read", changed);
    };
  }, [refresh, teamId]);
  return {
    data: data?.teamId === teamId ? data : null,
    error,
    loading,
    refresh,
  };
}
