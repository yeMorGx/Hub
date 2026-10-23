"use client";
import { ZuluForm } from "./dashboard-ui";
import { ZuluButton, ZuluLabel, ZuluInput, ZuluTextArea, ZuluSelect, ZuluCheckboxField } from "./dashboard-ui";
import { saveConversation, vaultUnlocked } from "@/public/offline-vault.js";
import { parseChatCommand } from "@/lib/hub/commands";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ChatCircleText,
  Check,
  DotsThree,
  DownloadSimple,
  File,
  Heart,
  MagnifyingGlass,
  Microphone,
  Paperclip,
  PaperPlaneTilt,
  PushPin,
  Smiley,
  Stop,
  ThumbsUp,
  X,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { useChannel } from "@/lib/hub/use-channel";
import type { Row } from "@/lib/hub/types";
import { errorMessage } from "@/lib/supabase/errors";
import { PersonAvatar } from "./hub-ui";
type Message = Row<"messages">;
type ChannelController = ReturnType<typeof useChannel>;
const reactionOptions = [
  { id: "like", label: "Gostei", icon: ThumbsUp },
  { id: "heart", label: "Adorei", icon: Heart },
  { id: "celebrate", label: "Celebrar", icon: Smiley },
  { id: "eyes", label: "Estou acompanhando", icon: MagnifyingGlass },
  { id: "check", label: "Resolvido", icon: Check },
] as const;
export function AdvancedConversation({
  hub,
  channel,
  channelId,
  moderator,
  onEdit,
  personName,
}: {
  hub: HubController;
  channel: ChannelController;
  channelId: string;
  moderator: boolean;
  onEdit: (message: Message) => void;
  personName: (id: string) => string;
}) {
  const [draft, setDraft] = useState(""),
    [root, setRoot] = useState<Message | null>(null),
    [thread, setThread] = useState<Message[]>([]),
    [threadMore, setThreadMore] = useState(false),
    [threadBusy, setThreadBusy] = useState(false),
    [mode, setMode] = useState<"conversation" | "search" | "pins">(
      "conversation",
    ),
    [search, setSearch] = useState(""),
    [results, setResults] = useState<Message[]>([]),
    [searchBusy, setSearchBusy] = useState(false),
    [searchMore, setSearchMore] = useState(false);
  const [reactions, setReactions] = useState<Row<"message_reactions">[]>([]),
    [pins, setPins] = useState<Row<"message_pins">[]>([]),
    [pinMessages, setPinMessages] = useState<Message[]>([]),
    [files, setFiles] = useState<Row<"attachments">[]>([]),
    [pending, setPending] = useState<Row<"attachments">[]>([]),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [mentions, setMentions] = useState<string[]>([]),
    [mentionChannel, setMentionChannel] = useState(false),
    [atBottom, setAtBottom] = useState(true),
    [recording, setRecording] = useState(false);
  const serial = useRef(0),
    threadSerial = useRef(0),
    searchSerial = useRef(0),
    retry = useRef<{ key: string; id: string } | null>(null),
    scroller = useRef<HTMLDivElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    uploadInput = useRef<HTMLInputElement>(null),
    rootRef = useRef(root),
    alive = useRef(true);
  const client = hub.client;
  useEffect(() => {
    rootRef.current = root;
  }, [root]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      serial.current++;
      searchSerial.current++;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const ids = [
    ...new Set(
      [...channel.messages, ...thread, ...results, ...pinMessages].map(
        (m) => m.id,
      ),
    ),
  ];
  useEffect(() => {
    const generation = ++serial.current;
    async function load() {
      try {
        const pinResult = await client
          .from("message_pins")
          .select("*")
          .eq("channel_id", channelId)
          .eq("active", true)
          .order("updated_at", { ascending: false })
          .limit(100);
        if (pinResult.error) throw pinResult.error;
        const pinnedIds = (pinResult.data || []).map((p) => p.message_id);
        const pinned = pinnedIds.length
          ? await client
              .from("messages")
              .select("*")
              .eq("channel_id", channelId)
              .in("id", pinnedIds)
              .is("deleted_at", null)
          : { data: [], error: null };
        if (pinned.error) throw pinned.error;
        const allIds = [...new Set([...ids, ...pinnedIds])];
        const reactions: Row<"message_reactions">[] = [],
          attachments: Row<"attachments">[] = [];
        for (let i = 0; i < allIds.length; i += 100) {
          const batch = allIds.slice(i, i + 100);
          const [r, a] = await Promise.all([
            client
              .from("message_reactions")
              .select("*")
              .eq("channel_id", channelId)
              .eq("active", true)
              .in("message_id", batch),
            client
              .from("attachments")
              .select("*")
              .eq("channel_id", channelId)
              .eq("state", "ready")
              .in("message_id", batch),
          ]);
          if (r.error) throw r.error;
          if (a.error) throw a.error;
          reactions.push(...(r.data || []));
          attachments.push(...(a.data || []));
        }
        if (generation !== serial.current || !alive.current) return;
        setReactions(reactions);
        setFiles(attachments);
        setPins(pinResult.data || []);
        setPinMessages(pinned.data || []);
      } catch (e) {
        if (generation === serial.current && alive.current) {
          setReactions([]);
          setFiles([]);
          setPins([]);
          setPinMessages([]);
          setError(errorMessage(e));
        }
      }
    }
    void load();
    // Message refresh also carries the private reaction/pin/attachment updates.
  }, [client, channelId, channel.messages, thread, results]);
  async function loadThread(message: Message, older = false) {
    const generation = ++threadSerial.current;
    setThreadBusy(true);
    try {
      const target = await client
        .from("messages")
        .select("*")
        .eq("id", message.reply_to || message.id)
        .eq("channel_id", channelId)
        .single();
      if (target.error) throw target.error;
      if (!target.data || generation !== threadSerial.current || !alive.current)
        return;
      const parent = target.data;
      const preserve = rootRef.current?.id === parent.id;
      rootRef.current = parent;
      setRoot(parent);
      let q = client
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .eq("reply_to", parent.id)
        .order("ordinal", { ascending: false })
        .limit(50);
      if (older && thread.length) q = q.lt("ordinal", thread[0].ordinal);
      const { data, error } = await q;
      if (error) throw error;
      if (!alive.current || generation !== threadSerial.current) return;
      setThread((previous) => {
        const merged = new Map(
          (preserve ? previous : []).map((m) => [m.id, m]),
        );
        for (const row of data || []) merged.set(row.id, row);
        return [...merged.values()].sort((a, b) => a.ordinal - b.ordinal);
      });
      setThreadMore((current) =>
        older || !preserve || thread.length <= 50
          ? data?.length === 50
          : current,
      );
      setMode("conversation");
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (alive.current && generation === threadSerial.current)
        setThreadBusy(false);
    }
  }
  useEffect(() => {
    if (rootRef.current) void loadThread(rootRef.current);
  }, [channel.messages]);
  useEffect(() => {
    if (!atBottom || mode !== "conversation" || root) return;
    const list = scroller.current;
    if (list) list.scrollTop = list.scrollHeight;
    const latest = channel.messages.at(-1);
    if (latest && !document.hidden) void channel.markRead(latest.ordinal);
  }, [channel.messages, atBottom, mode, root]);
  useEffect(() => {
    const visible = () => {
      const latest = channel.messages.at(-1);
      if (atBottom && !document.hidden && latest)
        void channel.markRead(latest.ordinal);
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [channel.messages, atBottom]);
  async function runSearch(older = false) {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const generation = ++searchSerial.current;
    setSearchBusy(true);
    try {
      const { data, error } = await client.rpc("search_channel_messages", {
        p_channel_id: channelId,
        p_query: search.trim(),
        p_before_ordinal: older ? results.at(-1)?.ordinal : undefined,
      });
      if (error) throw error;
      if (generation !== searchSerial.current || !alive.current) return;
      setResults((prev) => (older ? [...prev, ...(data || [])] : data || []));
      setSearchMore(data?.length === 50);
    } catch (e) {
      if (generation === searchSerial.current) setError(errorMessage(e));
    } finally {
      if (generation === searchSerial.current) setSearchBusy(false);
    }
  }
  async function upload(file: globalThis.File) {
    if (uploading || pending.length >= 10 || !alive.current) return;
    setUploading(true);
    setError("");
    let reserved: string | undefined;
    try {
      if (file.size > 26214400 || file.size === 0)
        throw new Error("Arquivo inválido. O limite é 25 MB.");
      const mime = file.type.split(";")[0] || "application/octet-stream";
      reserved = (await hub.rpc("reserve_attachment", {
        p_channel_id: channelId,
        p_filename: file.name.slice(0, 240),
        p_mime_type: mime,
        p_byte_size: file.size,
      })) as string;
      const { data: item, error: lookupError } = await client
        .from("attachments")
        .select("*")
        .eq("id", reserved)
        .single();
      if (lookupError) throw lookupError;
      const { error: uploadError } = await client.storage
        .from("hub-files")
        .upload(item.object_path, file, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      await hub.rpc("finish_attachment", { p_attachment_id: reserved });
      if (alive.current) setPending((p) => [...p, { ...item, state: "ready" }]);
    } catch (e) {
      if (reserved)
        await hub
          .rpc("remove_attachment", { p_attachment_id: reserved })
          .catch(() => {});
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setUploading(false);
    }
  }
  async function removePending(item: Row<"attachments">) {
    try {
      await hub.rpc("remove_attachment", { p_attachment_id: item.id });
      await client.storage.from("hub-files").remove([item.object_path]);
      setPending((p) => p.filter((a) => a.id !== item.id));
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      if (!navigator.mediaDevices || !globalThis.MediaRecorder)
        throw new Error("Gravação indisponível neste navegador.");
      const source = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = source;
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      const r = new MediaRecorder(
        source,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        source.getTracks().forEach((t) => t.stop());
        if (!alive.current) return;
        const type = r.mimeType.split(";")[0];
        const blob = new Blob(chunks, { type });
        if (blob.size)
          void upload(
            new globalThis.File(
              [blob],
              `audio-${Date.now()}.${type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"}`,
              { type },
            ),
          );
      };
      r.start();
      setRecording(true);
      setTimeout(() => {
        if (r.state === "recording") {
          r.stop();
          if (alive.current) setRecording(false);
        }
      }, 120000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (
      hub.busy ||
      uploading ||
      recording ||
      (!draft.trim() && !pending.length)
    )
      return;
    const text = draft.trim(),
      attachments = pending.map((p) => p.id),
      key = JSON.stringify([
        text,
        root?.id,
        attachments,
        mentions,
        mentionChannel,
      ]);
    if (retry.current?.key !== key)
      retry.current = { key, id: crypto.randomUUID() };
    const command = parseChatCommand(text);
    if (command && ("error" in command || root || attachments.length)) {
      setError(
        "error" in command
          ? command.error
          : "Envie comandos no canal, sem anexos ou thread.",
      );
      return;
    }
    const sent = await hub.mutate(
      () =>
        command && !("error" in command)
          ? hub.rpc("run_channel_command", {
              p_channel_id: channelId,
              p_client_id: retry.current!.id,
              p_action: command.action,
              p_description: command.description,
              p_starts_at: command.startsAt,
              p_ends_at: command.endsAt,
              p_timezone: command.timezone,
            })
          : hub.rpc("send_rich_message", {
              p_channel_id: channelId,
              p_client_id: retry.current!.id,
              p_body: text,
              p_reply_to: root?.id,
              p_attachment_ids: attachments,
              p_mention_ids: mentions,
              p_mention_channel: mentionChannel,
            }),
      "Mensagem enviada.",
    );
    if (sent.ok) {
      if (process.env.NEXT_PUBLIC_PUSH_ENABLED === "true")
        void hub.client.functions
          .invoke("hub-notifications", { body: { message_id: sent.value } })
          .catch(() => {});
      setDraft("");
      setPending([]);
      setMentions([]);
      setMentionChannel(false);
      retry.current = null;
      setAtBottom(true);
      await channel.refresh();
      if (root) await loadThread(root);
    } else setError(sent.error || "Não foi possível enviar.");
  }
  useEffect(() => {
    if (!vaultUnlocked(hub.userId) || !channel.messages.length) return;
    void saveConversation(hub.userId, {
      id: channelId,
      name:
        hub.snapshot.channels.find((c) => c.id === channelId)?.name ||
        "Conversa",
      savedAt: Date.now(),
      messages: channel.messages
        .filter((m) => !m.deleted_at)
        .slice(-200)
        .map((m) => ({
          id: m.id,
          author: personName(m.author_id),
          body: m.body,
          createdAt: m.created_at,
        })),
    }).catch(() => {});
  }, [channel.messages, channelId, hub.userId]);
  const shown =
    mode === "search"
      ? results
      : mode === "pins"
        ? pinMessages
        : root
          ? [root, ...thread]
          : channel.messages;
  const card = (message: Message) => {
    const activeReactions = reactions.filter(
      (r) => r.message_id === message.id,
    );
    return (
      <article
        key={message.id}
        className={`advanced-message ${message.author_id === hub.userId ? "own-message" : ""}`}
      >
        <PersonAvatar
          name={personName(message.author_id)}
          id={message.author_id}
        />
        <div className="advanced-message-body">
          <header>
            <strong>{personName(message.author_id)}</strong>
            {message.source !== "user" && (
              <span className="tag">
                {message.source === "webhook" ? "Automação" : "Comando"}
              </span>
            )}
            <time dateTime={message.created_at}>
              {new Date(message.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            {pins.some((p) => p.message_id === message.id) && (
              <PushPin size={13} />
            )}
          </header>
          {message.reply_to && !root && (
            <ZuluButton
              className="text-button thread-context"
              onClick={() => void loadThread(message)}
            >
              <ChatCircleText size={14} />
              Resposta em uma conversa
            </ZuluButton>
          )}
          <p className={message.deleted_at ? "message-deleted" : ""}>
            {message.deleted_at ? "Mensagem removida" : message.body}
          </p>
          {!message.deleted_at &&
            files
              .filter((a) => a.message_id === message.id)
              .map((a) => <MessageFile key={a.id} item={a} hub={hub} />)}
          {!message.deleted_at && (
            <div className="message-tools">
              {reactionOptions.map((r) => {
                const group = activeReactions.filter(
                    (a) => a.reaction === r.id,
                  ),
                  own = group.some((a) => a.user_id === hub.userId);
                return (
                  <ZuluButton
                    key={r.id}
                    className={`reaction-button ${own ? "selected" : ""}`}
                    aria-label={`${r.label}: ${group.length}`}
                    aria-pressed={own}
                    disabled={hub.busy}
                    onClick={async () => {
                      const result = await hub.mutate(
                        () =>
                          hub.rpc("react_to_message", {
                            p_message_id: message.id,
                            p_reaction: r.id,
                            p_active: !own,
                          }),
                        "Reação atualizada.",
                      );
                      if (result.ok) await channel.refresh();
                    }}
                  >
                    <r.icon size={13} weight={own ? "fill" : "regular"} />
                    {group.length || ""}
                  </ZuluButton>
                );
              })}
              {!message.reply_to && (
                <ZuluButton
                  className="text-button"
                  onClick={() => void loadThread(message)}
                >
                  <ChatCircleText size={14} />
                  Responder
                </ZuluButton>
              )}
              {moderator && (
                <ZuluButton
                  className="icon-button"
                  aria-label={
                    pins.some((p) => p.message_id === message.id)
                      ? "Desafixar mensagem"
                      : "Fixar mensagem"
                  }
                  disabled={hub.busy}
                  onClick={async () => {
                    await hub.mutate(
                      () =>
                        hub.rpc("pin_message", {
                          p_message_id: message.id,
                          p_active: !pins.some(
                            (p) => p.message_id === message.id,
                          ),
                        }),
                      "Fixação atualizada.",
                    );
                    await channel.refresh();
                  }}
                >
                  <PushPin size={14} />
                </ZuluButton>
              )}
              {(message.author_id === hub.userId || moderator) && (
                <ZuluButton
                  className="icon-button"
                  aria-label="Editar ou remover mensagem"
                  onClick={() => onEdit(message)}
                >
                  <DotsThree size={17} />
                </ZuluButton>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };
  return (
    <div className="advanced-conversation">
      <div className="conversation-tools">
        <ZuluButton
          className={
            mode === "conversation" ? "text-button selected" : "text-button"
          }
          onClick={() => {
            setMode("conversation");
            setRoot(null);
            setThread([]);
          }}
        >
          Conversa
        </ZuluButton>
        <ZuluButton
          className={mode === "pins" ? "text-button selected" : "text-button"}
          onClick={() => {
            setMode("pins");
            setRoot(null);
          }}
        >
          <PushPin size={16} />
          Fixadas{pins.length ? ` (${pins.length})` : ""}
        </ZuluButton>
        <ZuluButton
          className={mode === "search" ? "text-button selected" : "text-button"}
          onClick={() => {
            setMode("search");
            setRoot(null);
          }}
        >
          <MagnifyingGlass size={16} />
          Buscar
        </ZuluButton>
      </div>
      {root && (
        <div className="thread-heading">
          <ZuluButton
            className="text-button"
            onClick={() => {
              threadSerial.current++;
              setRoot(null);
              rootRef.current = null;
              setThread([]);
            }}
          >
            <ArrowLeft size={16} />
            Voltar ao canal
          </ZuluButton>
          <span>Respostas</span>
        </div>
      )}
      {mode === "search" && (
        <ZuluForm
          className="conversation-search"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
        >
          <ZuluLabel className="sr-only" htmlFor="conversation-search">
            Buscar no histórico
          </ZuluLabel>
          <ZuluInput
            id="conversation-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setResults([]);
              setSearchMore(false);
              searchSerial.current++;
              setSearchBusy(false);
            }}
            placeholder="Busque palavras ou use aspas para uma frase"
            minLength={2}
            maxLength={200}
          />
          <ZuluButton className="outline-button" disabled={searchBusy}>
            Buscar
          </ZuluButton>
        </ZuluForm>
      )}
      {error && (
        <div className="form-alert" role="alert">
          {error}
          <ZuluButton
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setError("")}
          >
            <X size={16} />
          </ZuluButton>
        </div>
      )}
      <div
        className="advanced-messages"
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
        }}
      >
        {mode === "conversation" && !root && channel.hasOlder && (
          <ZuluButton
            className="load-older-button"
            disabled={channel.loadingOlder}
            onClick={() => {
              setAtBottom(false);
              void channel.loadOlder();
            }}
          >
            Carregar mensagens anteriores
          </ZuluButton>
        )}
        {root && threadMore && (
          <ZuluButton
            className="load-older-button"
            disabled={threadBusy}
            onClick={() => void loadThread(root, true)}
          >
            Carregar respostas anteriores
          </ZuluButton>
        )}
        {channel.loading ? (
          <p role="status">Carregando conversa…</p>
        ) : channel.error ? (
          <p className="form-error" role="alert">
            {channel.error}
          </p>
        ) : shown.length ? (
          shown.map(card)
        ) : (
          <div className="conversation-empty">
            <ChatCircleText size={30} />
            <p>
              {mode === "search"
                ? "Use a busca para encontrar mensagens neste canal."
                : mode === "pins"
                  ? "As mensagens fixadas pela moderação aparecem aqui."
                  : "O espaço está aberto para uma boa conversa."}
            </p>
          </div>
        )}
        {searchMore && mode === "search" && (
          <ZuluButton
            className="load-older-button"
            disabled={searchBusy}
            onClick={() => void runSearch(true)}
          >
            Mais resultados
          </ZuluButton>
        )}
      </div>
      {mode === "conversation" && (
        <>
          {!atBottom && (
            <ZuluButton
              className="new-messages-button"
              onClick={() => {
                const list = scroller.current;
                if (list) list.scrollTop = list.scrollHeight;
                setAtBottom(true);
              }}
            >
              Ir para mensagens recentes
              <ArrowDown size={14} />
            </ZuluButton>
          )}
          <div className="composer-context">
            {pending.map((a) => (
              <span key={a.id}>
                <Paperclip size={14} />
                {a.filename}
                <ZuluButton
                  className="icon-button"
                  type="button"
                  aria-label={`Remover ${a.filename}`}
                  onClick={() => void removePending(a)}
                >
                  <X size={13} />
                </ZuluButton>
              </span>
            ))}
            {mentions.map((id) => (
              <ZuluButton
                key={id}
                className="mention-token"
                onClick={() => setMentions((m) => m.filter((v) => v !== id))}
              >
                @{personName(id)} <X size={11} />
              </ZuluButton>
            ))}
          </div>
          <span className="typing-indicator" role="status">
            {recording
              ? "Gravando áudio · máximo de 2 minutos"
              : uploading
                ? "Enviando arquivo…"
                : channel.isTyping
                  ? "Alguém está digitando…"
                  : ""}
          </span>
          <ZuluForm className="message-form" onSubmit={(e) => void send(e)}>
            <ZuluLabel className="sr-only" htmlFor="advanced-draft">
              {root ? "Sua resposta" : "Sua mensagem"}
            </ZuluLabel>
            <ZuluTextArea
              id="advanced-draft"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                channel.publishTyping();
              }}
              placeholder={
                root ? "Responder nesta conversa…" : "Escreva para o time…"
              }
              maxLength={10000}
              rows={2}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer-bottom">
              <div className="composer-tools">
                <input
                  type="file"
                  ref={uploadInput}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = "";
                  }}
                />
                <ZuluButton
                  type="button"
                  className="icon-button"
                  aria-label="Anexar arquivo"
                  disabled={uploading || pending.length >= 10 || recording}
                  onClick={() => uploadInput.current?.click()}
                >
                  <Paperclip size={19} />
                </ZuluButton>
                <ZuluButton
                  type="button"
                  className={`icon-button ${recording ? "recording" : ""}`}
                  aria-label={recording ? "Parar gravação" : "Gravar áudio"}
                  disabled={uploading}
                  onClick={() => void record()}
                >
                  {recording ? <Stop size={19} /> : <Microphone size={19} />}
                </ZuluButton>
                <ZuluLabel>
                  <span className="sr-only">Mencionar pessoa</span>
                  <ZuluSelect
                    value=""
                    title="As menções notificam participantes deste canal"
                    onValueChange={(e) => {
                      if (e)
                        setMentions((m) => [
                          ...new Set([...m, e]),
                        ]);
                    }}
                  >
                    <option value="">@ Mencionar</option>
                    {hub.snapshot.people
                      .filter((p) => p.id !== hub.userId)
                      .map((p) => (
                        <option value={p.id} key={p.id}>
                          {p.display_name}
                        </option>
                      ))}
                  </ZuluSelect>
                </ZuluLabel>
                {moderator && (
                  <ZuluLabel className="mention-everyone">
                    <ZuluCheckboxField

                      checked={mentionChannel}
                      onCheckedChange={(e) => setMentionChannel(e)}
                    />
                    @canal
                  </ZuluLabel>
                )}
              </div>
              <ZuluButton
                className="send-button"
                type="submit"
                aria-label="Enviar mensagem"
                disabled={
                  hub.busy ||
                  uploading ||
                  recording ||
                  (!draft.trim() && !pending.length) ||
                  hub.connection === "offline"
                }
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </ZuluButton>
            </div>
          </ZuluForm>
        </>
      )}
    </div>
  );
}
function MessageFile({
  item,
  hub,
}: {
  item: Row<"attachments">;
  hub: HubController;
}) {
  const [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true),
    blobUrl = useRef("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);
  async function download() {
    setBusy(true);
    try {
      const { data, error } = await hub.client.storage
        .from("hub-files")
        .download(item.object_path);
      if (error) throw error;
      const object = URL.createObjectURL(data);
      if (!alive.current) {
        URL.revokeObjectURL(object);
        return;
      }
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = object;
      if (
        item.mime_type.startsWith("image/") ||
        item.mime_type.startsWith("audio/")
      )
        setUrl(object);
      else {
        const a = document.createElement("a");
        a.href = object;
        a.download = item.filename;
        a.click();
      }
      setError("");
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="message-attachment">
      <div>
        <File size={17} />
        <span>
          {item.filename}
          <small>{(item.byte_size / 1024).toFixed(0)} KB</small>
        </span>
        <ZuluButton
          className="icon-button"
          disabled={busy}
          aria-label={`Abrir ${item.filename}`}
          onClick={() => void download()}
        >
          <DownloadSimple size={18} />
        </ZuluButton>
      </div>
      {url && item.mime_type.startsWith("image/") && <><img src={url} alt={item.filename} loading="lazy" /><a href={url} download={item.filename} className="attachment-save">Baixar imagem</a></>}
      {url && item.mime_type.startsWith("audio/") && (
        <audio controls src={url} preload="none" />
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
