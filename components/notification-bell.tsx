"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Popover, Skeleton } from "@heroui/react";
import { ZuluButton } from "./dashboard-ui";
import { NotificationFeed } from "./notification-feed";
import { Bell, ArrowUpRight } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { Row } from "@/lib/hub/types";

export function NotificationBell({ hub, onOpen, onOpenChannel }: { hub: HubController; onOpen: () => void; onOpenChannel?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Row<"notifications">[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async (withItems: boolean) => {
    const serial = ++generation.current;
    if (!hub.teamId || !hub.canParticipate) return;
    if (withItems) { setLoading(true); setError(""); }
    try {
      const [total, rows] = await Promise.all([
        hub.client.from("notifications").select("id", { count: "exact", head: true }).eq("team_id", hub.teamId).is("read_at", null),
        withItems ? hub.client.from("notifications").select("*").eq("team_id", hub.teamId).order("created_at", { ascending: false }).limit(100) : Promise.resolve(null),
      ]);
      if (serial !== generation.current) return;
      if (total.error || rows?.error) throw total.error || rows?.error;
      setCount(total.count || 0);
      if (rows) setItems(rows.data || []);
    } catch { if (serial === generation.current && withItems) setError("Não foi possível carregar os avisos."); }
    finally { if (serial === generation.current) setLoading(false); }
  }, [hub.client, hub.teamId, hub.canParticipate]);
  useEffect(() => {
    setCount(0); setItems([]); setOpen(false);
    return () => { generation.current++; };
  }, [hub.teamId, hub.canParticipate]);
  useEffect(() => {
    if (!hub.teamId || !hub.canParticipate) return;
    void refresh(open);
    const poll = () => {
      if (document.hidden) return;
      // Reminder failure must not hide already persisted notifications.
      void Promise.resolve(hub.client.rpc("refresh_my_reminders", { p_team_id: hub.teamId })).then(() => refresh(open), () => refresh(open));
    };
    const timer = setInterval(poll, 60000);
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.teamId === hub.teamId && detail.origin !== "bell") void refresh(open);
    };
    window.addEventListener("zulu:notifications-read", changed);
    window.addEventListener("focus", poll);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener("focus", poll); window.removeEventListener("zulu:notifications-read", changed); };
  }, [hub.client, hub.teamId, open, refresh]);
  return <Popover isOpen={open} onOpenChange={setOpen}>
    <Button type="button" isIconOnly variant="tertiary" className="icon-button notification-bell" aria-label={`Notificações${count ? `, ${count} não lidas` : ""}`}><Bell size={20} />{count > 0 && <span>{count > 99 ? "99+" : count}</span>}</Button>
    <Popover.Content className="zulu-overlay notification-popover" placement="bottom end" offset={12}>
      <Popover.Dialog aria-label="Central de notificações">
        {loading && !items.length ? <div className="notification-loading" role="status" aria-label="Carregando notificações"><Skeleton className="notification-skeleton" /><Skeleton className="notification-skeleton" /><Skeleton className="notification-skeleton" /></div> : error ? <div className="notification-feed-empty"><p role="alert">{error}</p><ZuluButton className="text-button" onClick={() => void refresh(true)}>Tentar novamente</ZuluButton></div> : <NotificationFeed compact notifications={items} onRead={async id => {
          await hub.rpc("mark_notification_read", { p_notification_id: id });
          await refresh(true);
          window.dispatchEvent(new CustomEvent("zulu:notifications-read", { detail: { teamId: hub.teamId, origin: "bell" } }));
        }} onOpenChannel={id => { setOpen(false); if (onOpenChannel) onOpenChannel(id); else onOpen(); }} />}
        <ZuluButton className="notification-view-all text-button" onClick={() => { setOpen(false); onOpen(); }}>Ver todas as notificações<ArrowUpRight size={16} /></ZuluButton>
      </Popover.Dialog>
    </Popover.Content>
  </Popover>;
}
