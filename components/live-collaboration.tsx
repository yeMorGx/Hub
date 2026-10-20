"use client";
import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowClockwise,
  Bell,
  BookOpenText,
  Check,
  ClipboardText,
  NotePencil,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { useCollaboration } from "@/lib/hub/use-collaboration";
import { dayKey, mondayOf } from "@/lib/hub/dates";
import type { Row } from "@/lib/hub/types";
import { EmptyState, PersonAvatar } from "./hub-ui";
export function LiveCollaboration({
  hub,
  onOpenChannel,
  initialTab = "notes",
}: {
  hub: HubController;
  onOpenChannel: (id: string) => void;
  initialTab?: "notes" | "notifications";
}) {
  const store = useCollaboration(hub.teamId, true, hub.client);
  const [tab, setTab] = useState<
      "notes" | "standups" | "meetings" | "notifications"
    >(initialTab),
    [editing, setEditing] = useState<Row<"team_notes"> | null | undefined>(
      undefined,
    ),
    [preview, setPreview] = useState(false),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [period, setPeriod] = useState(dayKey(new Date())),
    [kind, setKind] = useState("daily"),
    [eventId, setEventId] = useState("");
  const data = store.data,
    canWrite = hub.canParticipate;
  const person = (id: string) =>
    hub.snapshot.people.find((p) => p.id === id)?.display_name || "Membro";
  async function saveNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const r = await hub.mutate(
      () =>
        hub.rpc("save_team_note", {
          p_team_id: hub.teamId,
          p_title: String(form.get("title")).trim(),
          p_body: body,
          p_note_id: editing?.id,
          p_expected_version: editing?.version,
        }),
      "Documento salvo.",
    );
    if (r.ok) {
      setEditing(undefined);
      await store.refresh();
    } else setError(r.error || "Não foi possível salvar.");
  }
  const own = data?.standups.find(
    (s) =>
      s.user_id === hub.userId && s.period_on === period && s.kind === kind,
  );
  const selectedEvent = hub.snapshot.events.find((e) => e.id === eventId);
  const meeting = data?.meetings.find((m) => m.event_id === eventId);
  return (
    <section className="collaboration-workspace">
      <nav className="workspace-tabs" aria-label="Colaboração">
        {(
          [
            { id: "notes", label: "Documentos", icon: BookOpenText },
            { id: "standups", label: "Check-ins", icon: ClipboardText },
            { id: "meetings", label: "Pautas e atas", icon: NotePencil },
            { id: "notifications", label: "Notificações", icon: Bell },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => {
              setTab(t.id);
              setEditing(undefined);
              setError("");
            }}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
        <button
          className="icon-button"
          onClick={() => void store.refresh()}
          aria-label="Atualizar colaboração"
        >
          <ArrowClockwise size={18} />
        </button>
      </nav>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {store.error ? (
        <EmptyState
          title="Não foi possível carregar"
          description={store.error}
          action="Tentar novamente"
          onAction={() => void store.refresh()}
        />
      ) : !data ? (
        <p role="status">Carregando colaboração…</p>
      ) : (
        <>
          {tab === "notes" &&
            (editing !== undefined ? (
              <div className="document-editor">
                <div className="workspace-section-heading">
                  <button
                    className="text-button"
                    onClick={() => setEditing(undefined)}
                  >
                    <ArrowLeft size={16} />
                    Todos os documentos
                  </button>
                  <button
                    className="outline-button"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? "Editar Markdown" : "Pré-visualizar"}
                  </button>
                </div>
                <form
                  className="dialog-form"
                  onSubmit={(e) => void saveNote(e)}
                >
                  <label>
                    Título
                    <input
                      key={editing?.id || "new"}
                      name="title"
                      defaultValue={editing?.title || ""}
                      required
                      maxLength={180}
                      readOnly={!canWrite}
                    />
                  </label>
                  {preview ? (
                    <article className="markdown-body">
                      <ReactMarkdown>
                        {body || "Escreva algo para pré-visualizar."}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <label>
                      Conteúdo em Markdown
                      <textarea
                        className="markdown-input"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={18}
                        maxLength={100000}
                        readOnly={!canWrite}
                      />
                    </label>
                  )}
                  <div className="dialog-actions">
                    {editing &&
                      (editing.created_by === hub.userId || hub.canManage) &&
                      canWrite && (
                        <button
                          className="text-button task-archive"
                          type="button"
                          disabled={hub.busy}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                "Arquivar este documento? Ele sairá da lista do time.",
                              )
                            )
                              return;
                            const r = await hub.mutate(
                              () =>
                                hub.rpc("save_team_note", {
                                  p_team_id: hub.teamId,
                                  p_title: editing.title,
                                  p_body: editing.body,
                                  p_note_id: editing.id,
                                  p_expected_version: editing.version,
                                  p_archived: true,
                                }),
                              "Documento arquivado.",
                            );
                            if (r.ok) {
                              setEditing(undefined);
                              await store.refresh();
                            } else
                              setError(r.error || "Não foi possível arquivar.");
                          }}
                        >
                          <Trash size={16} />
                          Arquivar
                        </button>
                      )}
                    {canWrite && (
                      <button
                        className="primary-button"
                        disabled={hub.busy}
                        type="submit"
                      >
                        Salvar documento
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="workspace-section-heading">
                  <div>
                    <h2>Conhecimento do time</h2>
                    <p>
                      Decisões, referências e ideias em um lugar compartilhado.
                    </p>
                  </div>
                  {canWrite && (
                    <button
                      className="primary-button"
                      onClick={() => {
                        setEditing(null);
                        setBody("");
                        setPreview(false);
                      }}
                    >
                      <Plus size={17} />
                      Novo documento
                    </button>
                  )}
                </div>
                {data.notes.length ? (
                  <div className="document-list">
                    {data.notes.map((note) => (
                      <button
                        key={note.id}
                        className="document-row"
                        onClick={() => {
                          setEditing(note);
                          setBody(note.body);
                          setPreview(!canWrite);
                        }}
                      >
                        <BookOpenText size={22} />
                        <span>
                          <strong>{note.title}</strong>
                          <small>
                            {person(note.updated_by)} ·{" "}
                            {new Date(note.updated_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </small>
                        </span>
                        <span>v{note.version}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<BookOpenText size={36} />}
                    title="O próximo conhecimento começa aqui"
                    description="Documente decisões e mantenha o contexto acessível ao time."
                  />
                )}
                {data.notes.length === 500 && (
                  <p className="muted">
                    Exibindo os 500 documentos atualizados mais recentemente.
                  </p>
                )}
              </>
            ))}
          {tab === "standups" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Como o trabalho está andando?</h2>
                  <p>Compartilhe avanços e peça ajuda sem ocupar a agenda.</p>
                </div>
                <div className="workspace-filters">
                  <label>
                    <span className="sr-only">Tipo de check-in</span>
                    <select
                      value={kind}
                      onChange={(e) => {
                        setKind(e.target.value);
                        setPeriod(
                          e.target.value === "weekly"
                            ? dayKey(mondayOf(new Date()))
                            : dayKey(new Date()),
                        );
                      }}
                    >
                      <option value="daily">Standup diário</option>
                      <option value="weekly">Check-in semanal</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Data do check-in</span>
                    <input
                      type="date"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      max={dayKey(new Date())}
                    />
                  </label>
                </div>
              </div>
              {canWrite && (
                <form
                  key={`${period}:${kind}:${own?.updated_at || "new"}`}
                  className="standup-form dialog-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const r = await hub.mutate(
                      () =>
                        hub.rpc("save_standup", {
                          p_team_id: hub.teamId,
                          p_period_on: period,
                          p_kind: kind,
                          p_accomplished: String(f.get("accomplished")),
                          p_planned: String(f.get("planned")),
                          p_blockers: String(f.get("blockers")),
                          p_mood: String(f.get("mood")),
                        }),
                      "Check-in publicado.",
                    );
                    if (r.ok) await store.refresh();
                    else setError(r.error || "Não foi possível publicar.");
                  }}
                >
                  <div className="standup-fields">
                    <label>
                      O que você concluiu?
                      <textarea
                        name="accomplished"
                        defaultValue={own?.accomplished || ""}
                        rows={3}
                        maxLength={5000}
                        required
                      />
                    </label>
                    <label>
                      Qual é o próximo passo?
                      <textarea
                        name="planned"
                        defaultValue={own?.planned || ""}
                        rows={3}
                        maxLength={5000}
                        required
                      />
                    </label>
                    <label>
                      Precisa de ajuda com algo?
                      <textarea
                        name="blockers"
                        defaultValue={own?.blockers || ""}
                        rows={3}
                        maxLength={5000}
                      />
                    </label>
                  </div>
                  <div className="workspace-section-heading">
                    <label>
                      Como você está?
                      <select name="mood" defaultValue={own?.mood || "steady"}>
                        <option value="great">Com energia</option>
                        <option value="steady">Tudo em ordem</option>
                        <option value="struggling">Preciso de apoio</option>
                      </select>
                    </label>
                    <button className="primary-button" disabled={hub.busy}>
                      {own ? "Atualizar check-in" : "Publicar check-in"}
                    </button>
                  </div>
                </form>
              )}
              <div className="standup-feed">
                {data.standups
                  .filter((s) => s.period_on === period && s.kind === kind)
                  .map((s) => (
                    <article key={s.id}>
                      <header>
                        <PersonAvatar name={person(s.user_id)} id={s.user_id} />
                        <div>
                          <strong>{person(s.user_id)}</strong>
                          <small>
                            {s.mood === "great"
                              ? "Com energia"
                              : s.mood === "struggling"
                                ? "Precisa de apoio"
                                : "Tudo em ordem"}
                          </small>
                        </div>
                      </header>
                      <div className="standup-fields">
                        <div>
                          <h3>Concluído</h3>
                          <p>{s.accomplished || "—"}</p>
                        </div>
                        <div>
                          <h3>Próximo passo</h3>
                          <p>{s.planned || "—"}</p>
                        </div>
                        <div>
                          <h3>Bloqueios</h3>
                          <p>{s.blockers || "Sem bloqueios informados."}</p>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!data.standups.some(
                (s) => s.period_on === period && s.kind === kind,
              ) && (
                <EmptyState
                  title="Nenhum check-in nesta data"
                  description="As respostas do time vão aparecer aqui."
                />
              )}
            </>
          )}
          {tab === "meetings" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Reuniões com contexto</h2>
                  <p>Prepare a pauta e registre as decisões do encontro.</p>
                </div>
                <label>
                  <span className="sr-only">Selecionar evento</span>
                  <select
                    value={eventId}
                    onChange={(e) => {
                      setEventId(e.target.value);
                      setError("");
                    }}
                  >
                    <option value="">Selecione um evento</option>
                    {hub.snapshot.events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {new Date(e.starts_at).toLocaleDateString("pt-BR")} ·{" "}
                        {e.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedEvent ? (
                <form
                  key={`${eventId}:${meeting?.version || 0}`}
                  className="dialog-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const r = await hub.mutate(
                      () =>
                        hub.rpc("save_meeting_documents", {
                          p_event_id: eventId,
                          p_agenda: String(f.get("agenda")),
                          p_minutes: String(f.get("minutes")),
                          p_expected_version: meeting?.version,
                        }),
                      "Pauta e ata salvas.",
                    );
                    if (r.ok) await store.refresh();
                    else setError(r.error || "Não foi possível salvar.");
                  }}
                >
                  <p className="muted">
                    {selectedEvent.title} ·{" "}
                    {new Date(selectedEvent.starts_at).toLocaleString("pt-BR")}
                  </p>
                  <label>
                    Pauta
                    <textarea
                      name="agenda"
                      defaultValue={meeting?.agenda || ""}
                      rows={8}
                      maxLength={50000}
                      readOnly={
                        !canWrite ||
                        (!hub.canManage &&
                          selectedEvent.created_by !== hub.userId)
                      }
                    />
                  </label>
                  <label>
                    Ata e decisões
                    <textarea
                      name="minutes"
                      defaultValue={meeting?.minutes || ""}
                      rows={8}
                      maxLength={50000}
                      readOnly={
                        !canWrite ||
                        (!hub.canManage &&
                          selectedEvent.created_by !== hub.userId)
                      }
                    />
                  </label>
                  {canWrite &&
                    (hub.canManage ||
                      selectedEvent.created_by === hub.userId) && (
                      <div className="dialog-actions">
                        <button className="primary-button" disabled={hub.busy}>
                          Salvar pauta e ata
                        </button>
                      </div>
                    )}
                </form>
              ) : (
                <EmptyState
                  title="Escolha um encontro"
                  description="A lista usa os eventos da semana selecionada no calendário e os eventos de hoje."
                />
              )}
            </>
          )}
          {tab === "notifications" && (
            <>
              <div className="workspace-section-heading">
                <div>
                  <h2>Seu contexto, em dia</h2>
                  <p>Menções e avisos dos times aos quais você tem acesso.</p>
                </div>
              </div>
              {data.notifications.length ? (
                <div className="document-list">
                  {data.notifications.map((n) => (
                    <article
                      className={`notification-row ${n.read_at ? "" : "unread"}`}
                      key={n.id}
                    >
                      <Bell size={20} />
                      <div>
                        <strong>
                          {n.kind === "mention"
                            ? "Você foi mencionado em uma conversa"
                            : n.kind === "meeting"
                              ? "Uma reunião está próxima"
                              : "Novo aviso do time"}
                        </strong>
                        <small>
                          {new Date(n.created_at).toLocaleString("pt-BR")}
                        </small>
                      </div>
                      {n.channel_id && (
                        <button
                          className="outline-button"
                          onClick={() => {
                            onOpenChannel(n.channel_id!);
                            void hub
                              .rpc("mark_notification_read", {
                                p_notification_id: n.id,
                              })
                              .then(() => store.refresh());
                          }}
                        >
                          Abrir conversa
                        </button>
                      )}
                      {!n.read_at && (
                        <button
                          className="icon-button"
                          aria-label="Marcar como lida"
                          onClick={() =>
                            void hub
                              .rpc("mark_notification_read", {
                                p_notification_id: n.id,
                              })
                              .then(() => store.refresh())
                          }
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Bell size={36} />}
                  title="Tudo em dia"
                  description="Quando alguém mencionar você, o aviso aparece aqui."
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
