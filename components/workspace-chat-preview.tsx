"use client";
import { useMemo, useState } from "react";
import { CaretLeft, Hash, MagnifyingGlass } from "@phosphor-icons/react";
import { AdvancedConversation } from "./advanced-conversation";
import { ZuluButton, ZuluInput } from "./dashboard-ui";
import { createDemoBackend, demoChannel } from "@/lib/hub/demo-backend";
import type { HubController } from "@/lib/hub/use-hub";
import type { useChannel } from "@/lib/hub/use-channel";

/** Shared live conversation UI, with explicitly fictional, read-only data. */
export function WorkspaceChatPreview({ hub }: { hub: HubController }) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState(true);
  const [notice, setNotice] = useState("");
  const channel = useMemo(() => ({ messages: createDemoBackend().messages, loading: false, error: "", hasOlder: false, loadingOlder: false, loadOlder: async () => {}, refresh: async () => {}, publishTyping: () => {}, markRead: async () => {}, isTyping: false }) as unknown as ReturnType<typeof useChannel>, []);
  return <section className={`chat-layout live-chat-layout ${list ? "mobile-channel-list" : "mobile-conversation"}`}>
    <aside className="channel-sidebar"><div className="channel-sidebar-heading"><h2>Conversas</h2><MagnifyingGlass size={18} /></div>
      <ZuluInput className="channel-search" aria-label="Buscar conversas" placeholder="Buscar conversa…" value={query} onChange={e => setQuery(e.target.value)} />
      <p className="list-label">Canais do time</p>
      {"projeto-hub".includes(query.toLowerCase()) ? <ZuluButton className="channel-button selected" onClick={() => setList(false)}><Hash size={18} /><span>projeto-hub</span></ZuluButton> : <p className="channel-empty-note" role="status">Nenhuma conversa encontrada.</p>}
      <p className="channel-empty-note">Demonstração · dados fictícios</p>
    </aside>
    <div className="chat-main"><div className="chat-head"><div><ZuluButton className="icon-button mobile-chat-back" aria-label="Voltar para canais" onClick={() => setList(true)}><CaretLeft size={20} /></ZuluButton><span className="channel-heading-icon"><Hash size={20} /></span><div><h2>projeto-hub</h2><small>{hub.snapshot.people.length} pessoas · demonstração</small></div></div></div>
      {notice && <p className="resource-note" role="status">{notice}</p>}
      <AdvancedConversation hub={hub} channel={channel} channelId={demoChannel} moderator onEdit={() => setNotice("Demonstração em memória. Nenhuma mensagem real será alterada.")} personName={id => hub.snapshot.people.find(p => p.id === id)?.display_name || "Membro"} />
    </div>
  </section>;
}
