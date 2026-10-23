"use client";
import { useState } from "react";
import { ToggleButtonGroup, ToggleButton } from "@heroui/react";
import { Bell, CalendarDots, ChatCircleText, Check, House, ArrowsLeftRight, At } from "@phosphor-icons/react";
import { ZuluButton } from "./dashboard-ui";
import type { Row } from "@/lib/hub/types";

export function notificationLabel(n: Row<"notifications">) {
  switch (n.kind) {
    case "message": return "Você recebeu uma mensagem direta";
    case "mention": return "Você foi mencionado em uma conversa";
    case "meeting": return "Uma reunião está próxima";
    case "home_office": return "Hoje é seu dia de home office";
    case "home_office_swap": return n.dedupe_key?.startsWith("home_office_swap_result:") ? "Seu pedido de troca foi respondido" : "Pedido de troca de home office";
    default: return "Novo aviso do time";
  }
}
const icons = { message: ChatCircleText, mention: At, meeting: CalendarDots, home_office: House, home_office_swap: ArrowsLeftRight };

/** No previews or sender identities are inferred from inaccessible messages. */
export function NotificationFeed({ notifications, onRead, onOpenChannel, compact = false }: {
  notifications: Row<"notifications">[];
  onRead: (id: string) => Promise<void>;
  onOpenChannel?: (channelId: string) => void;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState("");
  const unread = notifications.filter(n => !n.read_at).length;
  const visible = notifications.filter(n => filter === "all" || !n.read_at);
  async function markRead(id: string) {
    setError(""); setPending(ids => [...ids, id]);
    try { await onRead(id); }
    catch { setError("Não foi possível marcar como lida. Tente novamente."); }
    finally { setPending(ids => ids.filter(value => value !== id)); }
  }
  const today = new Date().toLocaleDateString("pt-BR");
  const groups = [
    { label: "Hoje", items: visible.filter(n => new Date(n.created_at).toLocaleDateString("pt-BR") === today) },
    { label: "Anteriores", items: visible.filter(n => new Date(n.created_at).toLocaleDateString("pt-BR") !== today) },
  ];
  return <div className={`notification-feed ${compact ? "notification-feed-compact" : ""}`}>
    <div className="notification-feed-heading">
      <div><h2>Notificações</h2><span>{unread ? `${unread} não lida${unread > 1 ? "s" : ""} nesta lista` : "Tudo em dia"}</span></div>
      <ToggleButtonGroup aria-label="Filtrar notificações" selectionMode="single" disallowEmptySelection selectedKeys={[filter]} onSelectionChange={keys => { const key = [...keys][0]; if (key) setFilter(String(key)); }}>
        <ToggleButton id="all">Todas</ToggleButton><ToggleButton id="unread">Não lidas</ToggleButton>
      </ToggleButtonGroup>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="notification-feed-list">
      {groups.map(group => group.items.length > 0 && <section key={group.label} aria-label={group.label}>
        <h3>{group.label}</h3>
        {group.items.map(n => {
          const Icon = icons[n.kind as keyof typeof icons] || Bell;
          return <article className={`notification-feed-row ${n.read_at ? "is-read" : "is-unread"}`} key={n.id}>
            <span className={`notification-feed-symbol notification-kind-${n.kind}`}><Icon size={20} /></span>
            <div className="notification-feed-copy"><strong>{notificationLabel(n)}</strong><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              {n.channel_id && onOpenChannel && <ZuluButton className="text-button" onClick={() => { onOpenChannel(n.channel_id!); if (!n.read_at) void markRead(n.id); }}>Abrir conversa</ZuluButton>}
            </div>
            {!n.read_at && <ZuluButton className="notification-read-action icon-button" aria-label="Marcar como lida" disabled={pending.includes(n.id)} onClick={() => void markRead(n.id)}><span className="notification-unread-dot" /><Check size={16} /></ZuluButton>}
          </article>;
        })}
      </section>)}
      {!visible.length && <div className="notification-feed-empty"><Bell size={28} /><h3>{filter === "unread" ? "Nenhuma notificação não lida" : "Tudo em dia"}</h3><p>Seus próximos avisos aparecem aqui.</p></div>}
    </div>
  </div>;
}
