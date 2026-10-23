"use client";
import { NotificationFeed } from "./notification-feed";
import { ZuluForm } from "./dashboard-ui";
import { ZuluButton, ZuluLabel, ZuluInput, ZuluTextArea, ZuluSelect } from "./dashboard-ui";
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
  embedded = false,
}: {
  hub: HubController;
  onOpenChannel: (id: string) => void;
  initialTab?: "notes" | "standups" | "meetings" | "notifications";
  embedded?: boolean;
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
      <nav className="workspace-tabs" aria-label="Colaboração" hidden={embedded}>
        {(
          [
            { id: "notes", label: "Documentos", icon: BookOpenText },
            { id: "standups", label: "Check-ins", icon: ClipboardText },
            { id: "meetings", label: "Pautas e atas", icon: NotePencil },
            { id: "notifications", label: "Notificações", icon: Bell },
          ] as const
        ).map((t) => (
          <ZuluButton
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
          </ZuluButton>
        ))}
        <ZuluButton
          className="icon-button"
          onClick={() => void store.refresh()}
          aria-label="Atualizar colaboração"
        >
          <ArrowClockwise size={18} />
        </ZuluButton>
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
                  <ZuluButton
                    className="text-button"
                    onClick={() => setEditing(undefined)}
                  >
                    <ArrowLeft size={16} />
                    Todos os documentos
                  </ZuluButton>
                  <ZuluButton
                    className="outline-button"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? "Editar Markdown" : "Pré-visualizar"}
                  </ZuluButton>
                </div>
                <ZuluForm
                  className="dialog-form"
                  onSubmit={(e) => void saveNote(e)}
                >
                  <ZuluLabel>
                    Título
                    <ZuluInput
                      key={editing?.id || "new"}
                      name="title"
                      defaultValue={editing?.title || ""}
                      required
                      maxLength={180}
                      readOnly={!canWrite}
                    />
                  </ZuluLabel>
                  {preview ? (
                    <article className="markdown-body">
                      <ReactMarkdown>
                        {body || "Escreva algo para pré-visualizar."}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <ZuluLabel>
                      Conteúdo em Markdown
                      <ZuluTextArea
                        className="markdown-input"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={18}
                        maxLength={100000}
                        readOnly={!canWrite}
                      />
                    </ZuluLabel>
                  )}
                  <div className="dialog-actions">
                    {editing &&
                      (editing.created_by === hub.userId || hub.canManage) &&
                      canWrite && (
                        <ZuluButton
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
                        </ZuluButton>
                      )}
                    {canWrite && (
                      <ZuluButton
                        className="primary-button"
                        disabled={hub.busy}
                        type="submit"
                      >
                        Salvar documento
                      </ZuluButton>
                    )}
                  </div>
                </ZuluForm>
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
                    <ZuluButton
                      className="primary-button"
                      onClick={() => {
                        setEditing(null);
                        setBody("");
                        setPreview(false);
                      }}
                    >
                      <Plus size={17} />
                      Novo documento
                    </ZuluButton>
                  )}
                </div>
                {data.notes.length ? (
                  <div className="document-list">
                    {data.notes.map((note) => (
                      <ZuluButton
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
                      </ZuluButton>
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
                  <ZuluLabel>
                    <span className="sr-only">Tipo de check-in</span>
                    <ZuluSelect
                      value={kind}
                      onValueChange={(e) => {
                        setKind(e);
                        setPeriod(
                          e === "weekly"
                            ? dayKey(mondayOf(new Date()))
                            : dayKey(new Date()),
                        );
                      }}
                    >
                      <option value="daily">Standup diário</option>
                      <option value="weekly">Check-in semanal</option>
                    </ZuluSelect>
                  </ZuluLabel>
                  <ZuluLabel>
                    <span className="sr-only">Data do check-in</span>
                    <ZuluInput
                      type="date"
                      value={period}
                      onValueChange={(e) => setPeriod(e)}
                      max={dayKey(new Date())}
                    />
                  </ZuluLabel>
                </div>
              </div>
              {canWrite && (
                <ZuluForm
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
                    <ZuluLabel>
                      O que você concluiu?
                      <ZuluTextArea
                        name="accomplished"
                        defaultValue={own?.accomplished || ""}
                        rows={3}
                        maxLength={5000}
                        required
                      />
                    </ZuluLabel>
                    <ZuluLabel>
                      Qual é o próximo passo?
                      <ZuluTextArea
                        name="planned"
                        defaultValue={own?.planned || ""}
                        rows={3}
                        maxLength={5000}
                        required
                      />
                    </ZuluLabel>
                    <ZuluLabel>
                      Precisa de ajuda com algo?
                      <ZuluTextArea
                        name="blockers"
                        defaultValue={own?.blockers || ""}
                        rows={3}
                        maxLength={5000}
                      />
                    </ZuluLabel>
                  </div>
                  <div className="workspace-section-heading">
                    <ZuluLabel>
                      Como você está?
                      <ZuluSelect name="mood" defaultValue={own?.mood || "steady"}>
                        <option value="great">Com energia</option>
                        <option value="steady">Tudo em ordem</option>
                        <option value="struggling">Preciso de apoio</option>
                      </ZuluSelect>
                    </ZuluLabel>
                    <ZuluButton className="primary-button" disabled={hub.busy}>
                      {own ? "Atualizar check-in" : "Publicar check-in"}
                    </ZuluButton>
                  </div>
                </ZuluForm>
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
                <ZuluLabel>
                  <span className="sr-only">Selecionar evento</span>
                  <ZuluSelect
                    value={eventId}
                    onValueChange={(e) => {
                      setEventId(e);
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
                  </ZuluSelect>
                </ZuluLabel>
              </div>
              {selectedEvent ? (
                <ZuluForm
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
                  <ZuluLabel>
                    Pauta
                    <ZuluTextArea
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
                  </ZuluLabel>
                  <ZuluLabel>
                    Ata e decisões
                    <ZuluTextArea
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
                  </ZuluLabel>
                  {canWrite &&
                    (hub.canManage ||
                      selectedEvent.created_by === hub.userId) && (
                      <div className="dialog-actions">
                        <ZuluButton className="primary-button" disabled={hub.busy}>
                          Salvar pauta e ata
                        </ZuluButton>
                      </div>
                    )}
                </ZuluForm>
              ) : (
                <EmptyState
                  title="Escolha um encontro"
                  description="A lista usa os eventos da semana selecionada no calendário e os eventos de hoje."
                />
              )}
            </>
          )}
          {tab === "notifications" && (
            <NotificationFeed notifications={data.notifications}
              onOpenChannel={onOpenChannel}
              onRead={async id => {
                await hub.rpc("mark_notification_read", { p_notification_id: id });
                await store.refresh();
                window.dispatchEvent(new CustomEvent("zulu:notifications-read", { detail: { teamId: hub.teamId, origin: "page" } }));
              }} />
          )}
        </>
      )}
    </section>
  );
}
