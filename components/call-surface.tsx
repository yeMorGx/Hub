"use client";

import type { ReactNode } from "react";
import { Headphones, WarningCircle, X, ChatCircle, MicrophoneSlash } from "@phosphor-icons/react";
import { ZuluButton } from "./dashboard-ui";

/** Product-owned call shell. Media is supplied by the LiveKit adapter, never a prefab. */
export function CallSurface({ name, status, connected, count, error, onDismissError, children, controls, chat, onToggleChat, chatOpen, unread = 0 }: {
  name: string; status: string; connected: boolean; count: number; error: string;
  onDismissError: () => void; children: ReactNode; controls: ReactNode;
  chat?: ReactNode; onToggleChat: () => void; chatOpen: boolean; unread?: number;
}) {
  return <section className="zulu-call" aria-label={`Chamada em ${name}`}>
    <header className="zulu-call-heading">
      <div className="zulu-call-identity"><span className="zulu-call-symbol"><Headphones size={23} /></span><div><h2>{name}</h2><p><span className="zulu-call-dot" data-connected={connected} />{status}<span aria-hidden="true">·</span>{count} {count === 1 ? "pessoa" : "pessoas"}</p></div></div>
      <ZuluButton type="button" className="zulu-call-chat-toggle" aria-label={chatOpen ? "Fechar conversa da chamada" : "Abrir conversa da chamada"} aria-pressed={chatOpen} onClick={onToggleChat}><ChatCircle size={21} /><span>Conversa</span>{unread > 0 && <b>{unread}</b>}</ZuluButton>
    </header>
    {error && <div className="zulu-call-error" role="alert"><WarningCircle size={20}/><span>{error}</span><ZuluButton type="button" aria-label="Fechar aviso" onClick={onDismissError}><X size={17}/></ZuluButton></div>}
    <div className="zulu-call-body" data-chat-open={chatOpen}><div className="zulu-call-stage">{children}</div>{chatOpen && <aside className="zulu-call-chat" aria-label="Conversa da chamada">{chat}</aside>}</div>
    <footer className="zulu-call-controls" aria-label="Controles da chamada">{controls}</footer>
  </section>;
}

export function CallAvatar({ name, local, muted }: {name: string; local?: boolean; muted?: boolean}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  return <div className="zulu-call-avatar-wrap"><div className="zulu-call-avatar" aria-hidden="true">{initials}</div><strong>{name}{local && <small>Você</small>}</strong><span>{muted ? <><MicrophoneSlash size={14}/>Microfone desligado</> : "Câmera desligada"}</span></div>;
}
