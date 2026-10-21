"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HubController } from "./use-hub";
import type { Row } from "./types";
import { errorMessage } from "@/lib/supabase/errors";
export type ReportRow = {
  entry_id: string;
  user_id: string;
  display_name: string;
  project_id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  description: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
};
export type ManagementData = {
  teamId: string;
  clients: Row<"clients">[];
  goals: Row<"time_goals">[];
  shifts: Row<"shifts">[];
  swaps: Row<"shift_swaps">[];
  absences: Row<"absences">[];
  dates: Row<"team_dates">[];
  schedule: { user_id: string; starts_on: string; ends_on: string }[];
};
export function useManagement(hub: HubController, from: string, to: string) {
  const [data, setData] = useState<ManagementData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const serial = useRef(0);
  const client = hub.client,
    teamId = hub.teamId;
  const refresh = useCallback(async () => {
    if (!teamId || !from || !to) return;
    const generation = ++serial.current;
    setLoading(true);
    try {
      const start = new Date(from + "T00:00:00").toISOString(),
        endDate = new Date(to + "T00:00:00");
      endDate.setDate(endDate.getDate() + 1);
      const result = await Promise.all([
        client
          .from("clients")
          .select("*")
          .eq("team_id", teamId)
          .order("name")
          .limit(500),
        client.from("time_goals").select("*").eq("team_id", teamId).limit(1000),
        client
          .from("shifts")
          .select("*")
          .eq("team_id", teamId)
          .gte("ends_at", start)
          .lt("starts_at", endDate.toISOString())
          .order("starts_at")
          .limit(1000),
        client
          .from("shift_swaps")
          .select("*")
          .eq("team_id", teamId)
          .in("status", ["pending", "accepted"])
          .order("created_at", { ascending: false })
          .limit(500),
        client
          .from("absences")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false })
          .limit(500),
        client
          .from("team_dates")
          .select("*")
          .eq("team_id", teamId)
          .order("happens_on")
          .limit(1000),
        client.rpc("absence_schedule", {
          p_team_id: teamId,
          p_from: from,
          p_to: to,
        }),
      ]);
      for (const response of result) if (response.error) throw response.error;
      if (generation !== serial.current) return;
      setData({
        teamId,
        clients: result[0].data || [],
        goals: result[1].data || [],
        shifts: result[2].data || [],
        swaps: result[3].data || [],
        absences: result[4].data || [],
        dates: result[5].data || [],
        schedule: result[6].data || [],
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
  }, [client, teamId, from, to]);
  useEffect(() => {
    setData(null);
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 20000);
    return () => {
      serial.current++;
      clearInterval(interval);
    };
  }, [refresh]);
  return {
    data: data?.teamId === teamId ? data : null,
    error,
    loading,
    refresh,
  };
}
