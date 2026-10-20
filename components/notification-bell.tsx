"use client";
import { useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
export function NotificationBell({
  hub,
  onOpen,
}: {
  hub: HubController;
  onOpen: () => void;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      if (document.hidden || !hub.teamId || !hub.canParticipate) return;
      const reminder = await hub.client.rpc("refresh_my_reminders", {
        p_team_id: hub.teamId,
      });
      if (reminder.error) return;
      const result = await hub.client
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("team_id", hub.teamId)
        .is("read_at", null);
      if (alive && !result.error) setCount(result.count || 0);
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [hub.client, hub.teamId, hub.canParticipate]);
  return (
    <button
      className="icon-button notification-bell"
      aria-label={`Notificações${count ? `, ${count} não lidas` : ""}`}
      onClick={() => {
        setCount(0);
        onOpen();
      }}
    >
      <Bell size={20} />
      {count > 0 && <span>{count > 99 ? "99+" : count}</span>}
    </button>
  );
}
