"use client";
import { ZuluButton } from "./dashboard-ui";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  ChartBar,
  ChatCircleText,
  Headphones,
  ShieldCheck,
} from "@phosphor-icons/react";
import { createDemoBackend, demoChannel } from "@/lib/hub/demo-backend";
import { LiveCollaboration } from "./live-collaboration";
import { LiveManagement } from "./live-management";
import { LiveIntegrations } from "./live-integrations";
import { LiveCalls } from "./live-calls";
import { AdvancedConversation } from "./advanced-conversation";
import type { useChannel } from "@/lib/hub/use-channel";
export function OperationsDemo() {
  const backend = useMemo(() => createDemoBackend(), []),
    [page, setPage] = useState("collaboration"),
    [notice, setNotice] = useState("");
  const { hub, messages } = backend;
  const channel = {
    messages,
    loading: false,
    error: "",
    hasOlder: false,
    loadingOlder: false,
    loadOlder: async () => {},
    refresh: async () => {},
    publishTyping: () => {},
    markRead: async () => {},
    isTyping: false,
  } as unknown as ReturnType<typeof useChannel>;
  return (
    <div className="operations-demo live-app">
      <header className="operations-demo-header">
        <a href="/demo">
          <ArrowLeft size={16} />
          Voltar ao dashboard
        </a>
        <span className="demo-badge">Demonstração · dados fictícios</span>
        <a href="/login">Entrar no ZULU</a>
      </header>
      <div className="operations-demo-layout">
        <aside>
          <a className="operations-brand" href="/demo" aria-label="ZULU">
            <img src="/brand/zulu-mark.svg" alt="" width="42" height="42" />
          </a>
          <p>ESTÚDIO FORMA</p>
          <nav aria-label="Módulos de demonstração">
            {[
              ["collaboration", "Colaboração", BookOpenText],
              ["management", "Gestão", ChartBar],
              ["chat", "Conversas", ChatCircleText],
              ["integrations", "Integrações", ShieldCheck],
              ["calls", "Chamadas", Headphones],
            ].map(([id, label, Icon]) => (
              <ZuluButton
                key={id as string}
                className={page === id ? "active" : ""}
                onClick={() => {
                  setPage(id as string);
                  setNotice("");
                }}
              >
                <Icon size={20} />
                <span>{label as string}</span>
              </ZuluButton>
            ))}
          </nav>
          <a className="text-button" href="/demo/calendar">
            Explorar calendário
          </a>
          <small>Uma prévia das próximas ferramentas do seu time.</small>
        </aside>
        <main>
          <div className="page-heading">
            <div>
              <h1>
                {page === "collaboration"
                  ? "Colaboração"
                  : page === "management"
                    ? "Gestão"
                    : page === "chat"
                      ? "Conversas"
                      : page === "calls"
                        ? "Chamadas"
                        : "Integrações"}
                <span className="heading-period">.</span>
              </h1>
              <p>Um espaço compartilhado para o trabalho acontecer.</p>
            </div>
          </div>
          {notice && <p role="status">{notice}</p>}
          {page === "collaboration" && (
            <LiveCollaboration
              hub={hub}
              onOpenChannel={() => setPage("chat")}
            />
          )}{" "}
          {page === "management" && <LiveManagement hub={hub} />}{" "}
          {page === "integrations" && <LiveIntegrations hub={hub} />}{" "}
          {page === "calls" && <LiveCalls hub={hub} demo />}{" "}
          {page === "chat" && (
            <section className="demo-advanced-chat">
              <div className="chat-header">
                <h2># projeto-hub</h2>
                <span>3 pessoas · demonstração</span>
              </div>
              <AdvancedConversation
                hub={hub}
                channel={channel}
                channelId={demoChannel}
                moderator
                onEdit={() =>
                  setNotice(
                    "Demonstração em memória. Nenhuma mensagem real será alterada.",
                  )
                }
                personName={(id) =>
                  hub.snapshot.people.find((p) => p.id === id)?.display_name ||
                  "Membro"
                }
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
