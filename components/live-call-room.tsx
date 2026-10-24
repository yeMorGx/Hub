"use client";
import { ZuluButton, ZuluLabel, ZuluInput } from "./dashboard-ui";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  VideoTrack, RoomAudioRenderer, useTracks, useConnectionState, useParticipants, useChat, useMediaDeviceSelect,
  type TrackReferenceOrPlaceholder, type TrackReference,
} from "@livekit/components-react";
import { isDesktopRuntime } from "@/lib/desktop/runtime";
import { CallSurface, CallAvatar } from "./call-surface";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";
import {
  shareProfiles,
  screenSharePublishOptions,
  type ShareProfile,
} from "@/lib/calls/screen-share";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  AppWindow,
  Monitor,
  MonitorArrowUp,
  Stop, Microphone, MicrophoneSlash, VideoCamera, VideoCameraSlash, PhoneDisconnect, CornersOut, ArrowUp, CaretDown, Check,
} from "@phosphor-icons/react";
import { RadioGroup, Radio, Label, Dropdown } from "@heroui/react";
import { HubDialog } from "@/components/hub-ui";
import "@livekit/components-styles";

type ShareSource = "window" | "monitor";

type NativeScreenSource = {
  sourceId: string;
  title: string;
  detail: string;
  kind: ShareSource;
  width: number;
  height: number;
  primary: boolean;
};

function ScreenShareControl({
  room,
  channelId,
  isDesktopApp,
  onError,
}: {
  room: Room;
  channelId: string;
  isDesktopApp: boolean;
  onError: (message: string) => void;
}) {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant({
    room,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [source, setSource] = useState<ShareSource>("window");
  const [profile, setProfile] = useState<ShareProfile>("balanced");
  const [starting, setStarting] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [nativeSharing, setNativeSharing] = useState(false);
  const [nativeSources, setNativeSources] = useState<NativeScreenSource[]>([]);
  const [nativeSelectedId, setNativeSelectedId] = useState("");
  const [nativePreview, setNativePreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  // Desktop capture never depends on a browser user-agent or falls back to getDisplayMedia.
  const usesNativeCapture = isDesktopApp || isDesktopRuntime();
  const isSharing = usesNativeCapture ? nativeSharing : isScreenShareEnabled;

  useEffect(() => {
    if (!usesNativeCapture) return;
    let mounted = true;
    let unlisten: (() => void) | undefined;
    void listen<string>("hub-native-share-ended", ({ payload }) => {
      if (!mounted) return;
      setNativeSharing(false);
      if (payload) onError(payload);
    }).then((dispose) => {
      if (mounted) unlisten = dispose;
      else dispose();
    });
    return () => {
      mounted = false;
      unlisten?.();
      void invoke("stop_native_screen_share").catch(() => undefined);
    };
  }, [usesNativeCapture, onError]);

  useEffect(() => {
    if (!dialogOpen || !usesNativeCapture || !nativeSelectedId) {
      setNativePreview("");
      return;
    }
    let active = true;
    setPreviewLoading(true);
    void invoke<string>("preview_native_screen_source", {
      sourceId: nativeSelectedId,
    })
      .then((preview) => {
        if (active) setNativePreview(preview);
      })
      .catch(() => {
        if (active) setNativePreview("");
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dialogOpen, usesNativeCapture, nativeSelectedId]);

  const toggleShare = async () => {
    if (isSharing) {
      try {
        if (usesNativeCapture) {
          await invoke("stop_native_screen_share");
          setNativeSharing(false);
        } else {
          await localParticipant.setScreenShareEnabled(false);
        }
      } catch {
        onError("Não foi possível parar o compartilhamento. Tente novamente.");
      }
      return;
    }
    if (usesNativeCapture) {
      setLoadingSources(true);
      onError("");
      try {
        const sources = await invoke<NativeScreenSource[]>(
          "list_native_screen_sources",
        );
        setNativeSources(sources);
        setNativeSelectedId((current) =>
          sources.some((source) => source.sourceId === current)
            ? current
            : sources.find((source) => source.kind === "window")?.sourceId ??
                sources[0]?.sourceId ??
                "",
        );
        setDialogOpen(true);
      } catch (cause) {
        onError(
          typeof cause === "string"
            ? cause
            : "Não foi possível listar as janelas e telas disponíveis.",
        );
      } finally {
        setLoadingSources(false);
      }
      return;
    }
    setDialogOpen(true);
  };

  const startShare = async () => {
    const selected = shareProfiles[profile];
    setDialogOpen(false);
    setStarting(true);
    onError("");
    try {
      if (usesNativeCapture) {
        if (!nativeSelectedId) {
          onError("Escolha uma janela ou uma tela para compartilhar.");
          return;
        }
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            client: "windows-native-screen",
          }),
        });
        const data = await response.json();
        if (!response.ok || typeof data.token !== "string") {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Não foi possível autorizar o compartilhamento.",
          );
        }
        await invoke("start_native_screen_share", {
          sourceId: nativeSelectedId,
          quality: profile,
          url: data.url,
          token: data.token,
        });
        setNativeSharing(true);
      } else {
        await localParticipant.setScreenShareEnabled(
          true,
          {
            video: { displaySurface: source },
            resolution: {
              width: selected.width,
              height: selected.height,
              frameRate: selected.frameRate,
            },
            contentHint: selected.contentHint,
          },
          screenSharePublishOptions(profile),
        );
      }
    } catch (cause) {
      onError(
        cause instanceof Error
          ? cause.message
          : typeof cause === "string"
            ? cause
            : "Não foi possível iniciar. Confira a permissão de captura e tente outra fonte ou qualidade.",
      );
    } finally {
      setStarting(false);
    }
  };

  const selectedProfile = shareProfiles[profile];

  return (
    <>
      <ZuluButton
        type="button"
        className="call-screen-share-toggle"
        onClick={() => void toggleShare()}
        disabled={starting || loadingSources}
        aria-pressed={isSharing}
        title={
          isSharing
            ? "Parar compartilhamento"
            : "Escolher janela, tela e qualidade"
        }
      >
        {isSharing ? (
          <>
            <Stop size={16} aria-hidden="true" />
            Parar compartilhamento
          </>
        ) : (
          <>
            <MonitorArrowUp size={17} aria-hidden="true" />
            {loadingSources
              ? "Carregando fontes…"
              : starting
                ? "Iniciando captura…"
                : "Compartilhar tela"}
          </>
        )}
      </ZuluButton>

      {dialogOpen && (
        <HubDialog
          title="Compartilhar tela"
          onClose={() => setDialogOpen(false)}
          wide={usesNativeCapture}
        >
          <p className="share-dialog-description">
            {usesNativeCapture
              ? "Escolha uma janela ou monitor e confira a prévia antes de transmitir."
              : "Escolha o tipo de fonte e a qualidade. Depois, selecione a janela ou o monitor na janela de captura do sistema."}
          </p>

          {usesNativeCapture ? (
            <div className="native-share-source-picker">
              <div className="native-share-preview">
                {nativePreview ? (
                  <img src={nativePreview} alt={`Prévia de ${nativeSources.find((item) => item.sourceId === nativeSelectedId)?.title ?? "fonte selecionada"}`} />
                ) : (
                  <div>
                    {previewLoading ? <span className="native-share-spinner" /> : <Monitor size={24} aria-hidden="true" />}
                    <span>{previewLoading ? "Carregando prévia…" : "Selecione uma fonte para ver a prévia"}</span>
                  </div>
                )}
              </div>
              <div className="native-share-source-list" role="group" aria-label="Janelas e telas disponíveis">
                {nativeSources.map((item) => {
                  const selected = nativeSelectedId === item.sourceId;
                  const Icon = item.kind === "window" ? AppWindow : Monitor;
                  return (
                    <ZuluButton
                      type="button"
                      key={item.sourceId}
                      aria-pressed={selected}
                      className={`native-share-source${selected ? " is-selected" : ""}`}
                      onClick={() => setNativeSelectedId(item.sourceId)}
                    >
                      <span className="native-share-source-icon"><Icon size={18} aria-hidden="true" /></span>
                      <span className="native-share-source-copy">
                        <strong>{item.title}</strong>
                        <small>{item.detail}{item.primary ? " · Principal" : ""}</small>
                      </span>
                      <i aria-hidden="true" />
                    </ZuluButton>
                  );
                })}
                {nativeSources.length === 0 && (
                  <p className="native-share-no-sources">Nenhuma janela ou tela disponível para captura.</p>
                )}
              </div>
            </div>
          ) : (
            <RadioGroup className="share-source-options" value={source} onChange={value=>setSource(value as ShareSource)}>
              <Label>Tipo de fonte</Label>
              <Radio value="window" className={source === "window" ? "is-selected" : ""}><Radio.Content><Radio.Control><Radio.Indicator/></Radio.Control><AppWindow size={20} aria-hidden="true"/><span><strong>Janela</strong><small>Um aplicativo por vez</small></span></Radio.Content></Radio>
              <Radio value="monitor" className={source === "monitor" ? "is-selected" : ""}><Radio.Content><Radio.Control><Radio.Indicator/></Radio.Control><Monitor size={20} aria-hidden="true"/><span><strong>Tela inteira</strong><small>O monitor completo</small></span></Radio.Content></Radio>
            </RadioGroup>
          )}
          <RadioGroup className="share-quality-options" value={profile} onChange={value=>setProfile(value as ShareProfile)}>
            <Label>Qualidade</Label>
            {(Object.keys(shareProfiles) as ShareProfile[]).map(key=><Radio key={key} value={key} className={profile===key?"is-selected":""}><Radio.Content><Radio.Control><Radio.Indicator/></Radio.Control><span><strong>{shareProfiles[key].label}</strong><small>{shareProfiles[key].details}</small></span></Radio.Content></Radio>)}
          </RadioGroup>

          <p className="share-quality-note">
            {usesNativeCapture
              ? "A captura usa a API nativa do Windows. A qualidade pode variar com a tela e a rede."
              : "A qualidade real depende do navegador, da tela e da conexão de quem transmite."}
          </p>

          <div className="dialog-actions">
            <ZuluButton
              className="outline-button"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </ZuluButton>
            <ZuluButton
              className="primary-button"
              onClick={() => void startShare()}
              disabled={starting || (usesNativeCapture && !nativeSelectedId)}
            >
              <MonitorArrowUp size={17} aria-hidden="true" />
              {starting
                ? "Iniciando…"
                : `Compartilhar ${selectedProfile.details}`}
            </ZuluButton>
          </div>
        </HubDialog>
      )}
    </>
  );
}

function DeviceMenu({ kind, room, onError }: { kind: "audioinput" | "videoinput"; room: Room; onError: (message: string) => void }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind, room, requestPermissions: false });
  const name = kind === "audioinput" ? "microfone" : "câmera";
  return <Dropdown><ZuluButton type="button" className="zulu-call-device" aria-label={`Escolher ${name}`}><CaretDown size={14}/></ZuluButton><Dropdown.Popover><Dropdown.Menu aria-label={`Dispositivos de ${name}`}>
    {devices.length ? devices.map((device, i) => <Dropdown.Item id={device.deviceId || `device-${i}`} key={device.deviceId || i} textValue={device.label || `${name} ${i + 1}`} onAction={() => { void setActiveMediaDevice(device.deviceId).catch(() => onError(`Não foi possível trocar o dispositivo de ${name}. Confira as permissões e tente novamente.`)); }}><Label>{device.label || `${name} ${i + 1}`}</Label>{activeDeviceId === device.deviceId && <Check size={16}/>}</Dropdown.Item>) : <Dropdown.Item id="empty" isDisabled><Label>Nenhum dispositivo encontrado</Label></Dropdown.Item>}
  </Dropdown.Menu></Dropdown.Popover></Dropdown>;
}

function CallConference({ room, channelId, channelName, isDesktopApp, error, setError, onLeave }: {
  room: Room; channelId: string; channelName: string; isDesktopApp: boolean; error: string; setError: (message: string) => void; onLeave: () => void;
}) {
  const allTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false });
  const tracks = allTracks.filter(track => track.source === Track.Source.ScreenShare || !track.participant.identity.startsWith("hub-share:"));
  const participants = useParticipants().filter(participant => !participant.identity.startsWith("hub-share:"));
  const state = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const { chatMessages, send, isSending } = useChat();
  const [chatOpen, setChatOpen] = useState(false), [draft, setDraft] = useState(""), [busy, setBusy] = useState(false), [focused, setFocused] = useState<string | null>(null);
  const [readCount, setReadCount] = useState(0);
  const messagesEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { if (chatOpen) messagesEnd.current?.scrollIntoView({ block: "nearest" }); }, [chatOpen, chatMessages.length]);
  useEffect(() => { if (chatOpen) setReadCount(chatMessages.length); }, [chatOpen, chatMessages.length]);
  const connected = state === ConnectionState.Connected;
  const status = connected ? "Na sala" : state === ConnectionState.Connecting ? "Conectando…" : state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting ? "Reconectando…" : "Desconectado";
  const key = (track: TrackReferenceOrPlaceholder) => `${track.participant.identity}:${track.source}`;
  const screens = tracks.filter(track => track.source === Track.Source.ScreenShare);
  const focus = focused === null ? screens[0] : tracks.find(track => key(track) === focused);
  const visible = focus ? [focus, ...tracks.filter(track => key(track) !== key(focus))] : tracks;
  async function toggle(kind: "microphone" | "camera") {
    setBusy(true);
    try { if (kind === "microphone") await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); else await localParticipant.setCameraEnabled(!isCameraEnabled); setError(""); }
    catch { setError(`Não foi possível ativar ${kind === "microphone" ? "o microfone" : "a câmera"}. Confira a permissão e o dispositivo nas configurações.`); }
    finally { setBusy(false); }
  }
  return <>
    <CallSurface name={channelName} status={status} connected={connected} count={participants.length} error={error} onDismissError={() => setError("")} chatOpen={chatOpen} onToggleChat={() => setChatOpen(open => !open)} unread={Math.max(0, chatMessages.length - readCount)}
      controls={<>
        <div className="zulu-call-control-pair"><ZuluButton type="button" className="zulu-call-toggle" aria-label={isMicrophoneEnabled ? "Desligar microfone" : "Ligar microfone"} aria-pressed={isMicrophoneEnabled} disabled={busy || !connected} onClick={() => void toggle("microphone")}>{isMicrophoneEnabled ? <Microphone size={21}/> : <MicrophoneSlash size={21}/>}<span>Microfone</span></ZuluButton><DeviceMenu kind="audioinput" room={room} onError={setError}/></div>
        <div className="zulu-call-control-pair"><ZuluButton type="button" className="zulu-call-toggle" aria-label={isCameraEnabled ? "Desligar câmera" : "Ligar câmera"} aria-pressed={isCameraEnabled} disabled={busy || !connected} onClick={() => void toggle("camera")}>{isCameraEnabled ? <VideoCamera size={21}/> : <VideoCameraSlash size={21}/>}<span>Câmera</span></ZuluButton><DeviceMenu kind="videoinput" room={room} onError={setError}/></div>
        <div className="zulu-call-share"><ScreenShareControl room={room} channelId={channelId} isDesktopApp={isDesktopApp} onError={setError}/></div>
        <ZuluButton type="button" className="zulu-call-leave" aria-label="Sair da chamada" onClick={() => { void room.disconnect(); onLeave(); }}><PhoneDisconnect size={21}/><span>Sair</span></ZuluButton>
      </>}
      chat={<><div className="zulu-call-chat-heading"><h3>Conversa da chamada</h3><p>As mensagens ficam só nesta sessão.</p></div><div className="zulu-call-messages" role="log" aria-label="Mensagens da chamada">{!chatMessages.length && <p className="zulu-call-chat-empty">Uma ideia, um link, uma pergunta.<br/>A conversa começa aqui.</p>}{chatMessages.map((message, i) => <article key={`${message.timestamp}-${i}`}><strong>{message.from?.name || message.from?.identity || "Participante"}</strong><p>{message.message}</p></article>)}<div ref={messagesEnd}/></div><form onSubmit={event => { event.preventDefault(); if (!draft.trim() || isSending) return; void send(draft.trim()).then(() => setDraft("")).catch(() => setError("A mensagem não foi enviada. Tente novamente.")); }}><ZuluInput aria-label="Mensagem na chamada" placeholder="Escreva uma mensagem…" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000}/><ZuluButton type="submit" aria-label="Enviar mensagem" disabled={!connected || isSending || !draft.trim()}><ArrowUp size={19}/></ZuluButton></form></>}
    >
      <div className="zulu-call-grid" data-focused={Boolean(focus)} data-count={visible.length}>
        {!visible.length && <div className="zulu-call-empty">{status}</div>}
        {visible.map(track => {
          const name = (track.participant.name || track.participant.identity || "Participante").replace(track.participant.identity.startsWith("hub-share:") ? / · tela$/ : /$^/, "");
          const screen = track.source === Track.Source.ScreenShare;
          const hasVideo = Boolean(track.publication && !track.publication.isMuted);
          return <div key={key(track)} className="zulu-call-tile" data-screen={screen} data-speaking={track.participant.isSpeaking}>
            {hasVideo ? <VideoTrack trackRef={track as TrackReference} manageSubscription /> : <CallAvatar name={name} local={track.participant.isLocal} muted={!track.participant.isMicrophoneEnabled}/>}
            {hasVideo && <div className="zulu-call-caption">{screen && <Monitor size={16}/>}<span>{screen ? `Tela de ${name}` : name}{track.participant.isLocal ? " · Você" : ""}</span>{!track.participant.isMicrophoneEnabled && !screen && <MicrophoneSlash size={15}/>}</div>}
            <ZuluButton type="button" className="zulu-call-focus" aria-label={Boolean(focus && key(focus) === key(track)) ? `Voltar à grade de ${name}` : `Destacar ${screen ? "tela de " : ""}${name}`} aria-pressed={Boolean(focus && key(focus) === key(track))} onClick={() => setFocused(focus && key(focus) === key(track) ? "" : key(track))}><CornersOut size={18}/></ZuluButton>
          </div>;
        })}
      </div>
    </CallSurface>
    <RoomAudioRenderer />
  </>;
}

export default function LiveCallRoom({ token, url, channelId, channelName = "Sala do time", video, audio, onLeave }: {
  token: string; url: string; channelId: string; channelName?: string; video: boolean; audio: boolean; onLeave: () => void;
}) {
  const room = useMemo(() => new Room({ adaptiveStream: true, dynacast: true }), []);
  const [error, setError] = useState(""), [isDesktopApp, setIsDesktopApp] = useState(false);
  useEffect(() => { setIsDesktopApp("__TAURI_INTERNALS__" in window); }, []);
  useEffect(() => {
    const failed = () => setError("Não foi possível acessar um dispositivo. Confira as permissões de câmera e microfone.");
    room.on(RoomEvent.MediaDevicesError, failed);
    return () => { room.off(RoomEvent.MediaDevicesError, failed); void room.disconnect(); };
  }, [room]);
  return <div className="zulu-call-room"><LiveKitRoom room={room} serverUrl={url} token={token} connect audio={audio} video={video} onDisconnected={onLeave}
    onError={() => setError("Não foi possível concluir uma ação da chamada. Confira sua conexão e as permissões dos dispositivos.")}>
    <CallConference room={room} channelId={channelId} channelName={channelName} isDesktopApp={isDesktopApp} error={error} setError={setError} onLeave={onLeave}/>
  </LiveKitRoom></div>;
}
