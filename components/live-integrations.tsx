"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  CalendarBlank,
  Check,
  Copy,
  Link,
  ShieldCheck,
  PlugsConnected,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { Row } from "@/lib/hub/types";
import type { SyncConflict } from "@/lib/integrations/sync";
import { errorMessage } from "@/lib/supabase/errors";
import { EmptyState } from "./hub-ui";
const names = { google: "Google Calendar", outlook: "Outlook" };
export function LiveIntegrations({ hub }: { hub: HubController }) {
  const [tab, setTab] = useState<"calendars" | "webhooks" | "audit">(
      "calendars",
    ),
    [connections, setConnections] = useState<Row<"calendar_connections">[]>([]),
    [hooks, setHooks] = useState<
      Omit<Row<"incoming_webhooks">, "token_hash">[]
    >([]),
    [audit, setAudit] = useState<Row<"audit_events">[]>([]),
    [status, setStatus] = useState<Record<string, boolean>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [secret, setSecret] = useState<{ id: string; token: string } | null>(null),
    [channel, setChannel] = useState(""),
    [name, setName] = useState(""),
    [conflicts, setConflicts] = useState<SyncConflict[]>([]),
    [activeSync, setActiveSync] = useState<Row<"calendar_connections"> | null>(
      null,
    ),
    [filter, setFilter] = useState(""),
    [moreAudit, setMoreAudit] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function refresh() {
    const results = await Promise.allSettled([
      hub.client
        .from("calendar_connections")
        .select("*")
        .eq("team_id", hub.teamId),
      fetch("/api/integrations/status", { cache: "no-store" }).then(
        async (response) => ({
          ok: response.ok,
          data: (await response.json()) as Record<string, unknown>,
        }),
      ),
    ]);
    if (!alive.current) return;

    const failures: string[] = [];
    const [connections, providerStatus] = results;
    if (connections.status === "fulfilled" && !connections.value.error) {
      setConnections(connections.value.data || []);
    } else {
      failures.push("Não foi possível carregar as conexões do time.");
    }
    if (
      providerStatus.status === "fulfilled" &&
      providerStatus.value.ok &&
      typeof providerStatus.value.data.google === "boolean" &&
      typeof providerStatus.value.data.outlook === "boolean"
    ) {
      setStatus(providerStatus.value.data as Record<string, boolean>);
    } else {
      setStatus({});
      const message =
        providerStatus.status === "fulfilled" &&
        typeof providerStatus.value.data.error === "string"
          ? providerStatus.value.data.error
          : "Não foi possível verificar a configuração dos provedores.";
      failures.unshift(message);
    }
    if (tab === "webhooks") {
      const webhooks = await hub.client
        .from("incoming_webhooks")
        .select(
          "id,team_id,channel_id,created_by,name,enabled,last_called_at,created_at",
        )
        .eq("team_id", hub.teamId);
      if (!alive.current) return;
      if (webhooks.error) {
        failures.push("Não foi possível carregar os webhooks do time.");
      } else {
        setHooks(webhooks.data || []);
      }
    }
    setError(failures[0] || "");
  }
  useEffect(() => {
    void refresh();
  }, [hub.teamId, tab]);
  async function api(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Não foi possível concluir.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function sync(
    connection: Row<"calendar_connections">,
    resolutions: Record<string, "hub" | "external"> = {},
  ) {
    setActiveSync(connection);
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setMonth(to.getMonth() + 6);
    let count = 0,
      round = 0;
    let pending: SyncConflict[] = [];
    let more = false;
    do {
      const result = await api(
        `/api/integrations/${connection.provider}/sync`,
        {
          connectionId: connection.id,
          from: from.toISOString(),
          to: to.toISOString(),
          resolutions,
        },
      );
      count += result.processed;
      pending = result.conflicts;
      more = result.more;
      round++;
    } while (more && round < 10 && alive.current);
    if (!alive.current) return;
    setConflicts(pending);
    const summary =
      count === 0
        ? "Sincronização concluída. Nenhuma alteração encontrada."
        : `${count} alteração${count === 1 ? "" : "ões"} sincronizada${count === 1 ? "" : "s"}.`;
    setNotice(
      `${summary}${more ? " Há mais eventos; sincronize novamente." : ""}`,
    );
    await refresh();
    await hub.refreshTeam();
  }
  async function loadAudit(append = false) {
    await run(async () => {
      let query = hub.client
        .from("audit_events")
        .select("*")
        .eq("workspace_id", hub.workspace!.id)
        .order("id", { ascending: false })
        .limit(51);
      if (filter) query = query.eq("entity_table", filter);
      if (append && audit.length)
        query = query.lt("id", audit[audit.length - 1].id);
      const result = await query;
      if (result.error) throw result.error;
      setMoreAudit(result.data.length > 50);
      setAudit((prev) =>
        append
          ? [...prev, ...result.data.slice(0, 50)]
          : result.data.slice(0, 50),
      );
    });
  }
  useEffect(() => {
    if (tab === "audit" && hub.isAdmin) void loadAudit();
  }, [tab, filter]);
  const webhookUrl = secret
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hub-webhook/${secret.id}`
    : "";
  return (
    <section className="workspace-module">
      <div className="workspace-module-heading">
        <div>
          <span className="eyebrow">CONEXÕES DO TIME</span>
          <h2>Integrações e segurança</h2>
          <p>Calendários conectados, automações e histórico das alterações.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Atualizar integrações"
          onClick={() => run(refresh)}
          disabled={busy}
        >
          <ArrowClockwise />
        </button>
      </div>
      <div className="workspace-tabs" role="tablist">
        {(
          [
            ["calendars", "Calendários", CalendarBlank],
            ["webhooks", "Webhooks", PlugsConnected],
            ...(hub.isAdmin ? [["audit", "Auditoria", ShieldCheck]] : []),
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key as string}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key as typeof tab);
              setSecret(null);
              setError("");
            }}
          >
            <Icon size={18} />
            {label as string}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="inline-notice">
          {notice}
        </p>
      )}
      {tab === "calendars" && (
        <>
          <p className="muted">
            Cada conexão usa um calendário separado “ZULU — seu time”. Eventos
            pessoais e convites a participantes não são copiados. Sincronização
            manual: últimos 30 dias e próximos 6 meses.
          </p>
          <div className="integration-grid">
            {(["google", "outlook"] as const).map((provider) => {
              const connection = connections.find(
                (c) => c.provider === provider,
              );
              return (
                <article className="integration-card" key={provider}>
                  <span className="integration-symbol">
                    <CalendarBlank size={25} />
                  </span>
                  <div>
                    <h3>{names[provider]}</h3>
                    <span className={`tag ${connection ? "success-tag" : ""}`}>
                      {connection
                        ? "Conectado"
                        : status[provider]
                          ? "Disponível para conectar"
                          : "Aguardando configuração"}
                    </span>
                  </div>
                  <p>
                    {connection
                      ? connection.last_synced_at
                        ? `Última atualização: ${new Date(connection.last_synced_at).toLocaleString("pt-BR")}`
                        : "Nenhuma sincronização realizada."
                      : status[provider]
                        ? "Autorize sua conta para trocar eventos com o time."
                        : "O administrador precisa configurar este serviço para habilitar a conexão."}
                  </p>
                  <div className="integration-actions">
                    {connection ? (
                      <>
                        <button
                          className="primary-button"
                          disabled={busy}
                          onClick={() => run(() => sync(connection))}
                        >
                          <ArrowClockwise size={16} />
                          Sincronizar
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            if (
                              confirm(
                                "Desconectar? O calendário externo e os eventos serão preservados.",
                              )
                            )
                              void run(async () => {
                                await api(
                                  `/api/integrations/${provider}/disconnect`,
                                  { connectionId: connection.id },
                                );
                                setConflicts([]);
                                await refresh();
                              });
                          }}
                        >
                          Desconectar
                        </button>
                      </>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={busy || !status[provider]}
                        onClick={() =>
                          run(async () => {
                            const result = await api(
                              `/api/integrations/${provider}/connect`,
                              { teamId: hub.teamId },
                            );
                            location.assign(result.url);
                          })
                        }
                      >
                        <Link size={16} />
                        Conectar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {conflicts.length > 0 && (
            <section className="panel">
              <h3>Revisar conflitos</h3>
              <p>
                Escolha a versão para cada evento antes de sincronizar
                novamente.
              </p>
              {conflicts.map((c) => (
                <div className="document-row" key={c.eventId}>
                  <div>
                    <strong>{c.title}</strong>
                    <p>{c.reason}</p>
                  </div>
                  <div className="integration-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        activeSync &&
                        run(() => sync(activeSync, { [c.eventId]: "hub" }))
                      }
                    >
                      Usar ZULU
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        activeSync &&
                        run(() => sync(activeSync, { [c.eventId]: "external" }))
                      }
                    >
                      Usar calendário
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
          <p className="muted">
            {status.backgroundSync
              ? "Atualizações externas são recebidas por webhooks. Sincronize manualmente para enviar alterações do ZULU."
              : "Atualização automática por webhooks do provedor ainda requer ativação pelo administrador."}
          </p>
        </>
      )}
      {tab === "webhooks" && (
        <>
          <p className="muted">
            Envie alertas do n8n, monitoramento ou tickets para um canal. O
            token aparece uma única vez e pode ser revogado aqui.
          </p>
          {hub.canManage && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const r = await hub.rpc("create_incoming_webhook", {
                    p_channel_id: channel,
                    p_name: name,
                  });
                  setSecret(r as unknown as { id: string; token: string });
                  setName("");
                  await refresh();
                });
              }}
            >
              <label>
                Nome
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Alertas do monitoramento"
                />
              </label>
              <label>
                Canal
                <select
                  required
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="">Escolha um canal</option>
                  {hub.snapshot.channels
                    .filter((c) => c.kind !== "dm" && !c.archived_at)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="primary-button" disabled={busy}>
                Criar webhook
              </button>
            </form>
          )}
          {secret && (
            <div className="webhook-secret">
              <h3>Guarde este token</h3>
              <p>
                Copie para a ferramenta que enviará os alertas. Fechar esta tela
                oculta o token.
              </p>
              <label>
                URL
                <input readOnly value={webhookUrl} />
              </label>
              <label>
                Authorization
                <input readOnly value={`Bearer ${secret.token}`} />
              </label>
              <code>
                {'{"event_id":"ticket-123","text":"Novo ticket recebido"}'}
              </code>
              <button
                className="secondary-button"
                onClick={() =>
                  run(async () => {
                    await navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          url: webhookUrl,
                          authorization: `Bearer ${secret.token}`,
                          body: {
                            event_id: "ticket-123",
                            text: "Novo ticket recebido",
                          },
                        },
                        null,
                        2,
                      ),
                    );
                    setNotice("Configuração copiada.");
                  })
                }
              >
                <Copy />
                Copiar configuração
              </button>
              <button className="text-button" onClick={() => setSecret(null)}>
                Já salvei
              </button>
            </div>
          )}
          {hooks.length ? (
            hooks.map((h) => (
              <div className="document-row" key={h.id}>
                <div>
                  <strong>{h.name}</strong>
                  <p>
                    #
                    {hub.snapshot.channels.find((c) => c.id === h.channel_id)
                      ?.name || "canal"}{" "}
                    · {h.enabled ? "Ativo" : "Revogado"}
                    {h.last_called_at
                      ? ` · Último envio ${new Date(h.last_called_at).toLocaleString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                <button
                  disabled={busy}
                  className="secondary-button"
                  onClick={() =>
                    run(async () => {
                      await hub.rpc("set_incoming_webhook", {
                        p_webhook_id: h.id,
                        p_enabled: !h.enabled,
                      });
                      await refresh();
                    })
                  }
                >
                  {h.enabled ? "Revogar" : "Reativar"}
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<PlugsConnected size={28} />}
              title="Seus alertas entram por aqui"
              description="Crie uma conexão para um canal que você modera."
            />
          )}
        </>
      )}
      {tab === "audit" && hub.isAdmin && (
        <>
          <div className="inline-form">
            <label>
              Tipo de registro
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {[
                  "messages",
                  "time_entries",
                  "events",
                  "tasks",
                  "team_members",
                  "absences",
                  "shifts",
                  "calendar_connections",
                  "incoming_webhooks",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => loadAudit()}
            >
              Atualizar
            </button>
          </div>
          <p className="muted">
            Visível apenas para administradores. O log registra ações e campos
            alterados; textos de mensagens, documentos e credenciais são
            omitidos.
          </p>
          {audit.length ? (
            audit.map((item) => (
              <details className="audit-row" key={item.id}>
                <summary>
                  <span>
                    {new Date(item.occurred_at).toLocaleString("pt-BR")}
                  </span>
                  <strong>
                    {item.action === "INSERT"
                      ? "Criou"
                      : item.action === "DELETE"
                        ? "Removeu"
                        : "Alterou"}{" "}
                    · {item.entity_table}
                  </strong>
                  <span>
                    {hub.snapshot.people.find((p) => p.id === item.actor_id)
                      ?.display_name || "Conta do workspace"}
                  </span>
                </summary>
                <p>ID: {item.entity_id}</p>
                <pre>{JSON.stringify(item.changes, null, 2)}</pre>
              </details>
            ))
          ) : (
            <EmptyState
              icon={<ShieldCheck size={28} />}
              title="Histórico de alterações"
              description="As ações do workspace aparecerão aqui."
            />
          )}
          {moreAudit && (
            <button
              disabled={busy}
              className="secondary-button"
              onClick={() => loadAudit(true)}
            >
              Carregar registros anteriores
            </button>
          )}
        </>
      )}
    </section>
  );
}
