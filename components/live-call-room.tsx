"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  VideoConference,
} from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  AppWindow,
  Monitor,
  MonitorArrowUp,
  Stop,
} from "@phosphor-icons/react";
import { HubDialog } from "@/components/hub-ui";
import "@livekit/components-styles";

type ShareSource = "window" | "monitor";
type ShareProfile = "balanced" | "smooth" | "sharp";

type NativeScreenSource = {
  sourceId: string;
  title: string;
  detail: string;
  kind: ShareSource;
  width: number;
  height: number;
  primary: boolean;
};

const shareProfiles = {
  balanced: {
    label: "Equilibrada",
    details: "1080p · 30 FPS",
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 4_500_000,
    contentHint: "detail" as const,
    degradationPreference: "maintain-resolution" as const,
  },
  smooth: {
    label: "Fluida",
    details: "1080p · 60 FPS",
    width: 1920,
    height: 1080,
    frameRate: 60,
    maxBitrate: 7_000_000,
    contentHint: "motion" as const,
    degradationPreference: "maintain-framerate" as const,
  },
  sharp: {
    label: "Mais nítida",
    details: "1440p · 60 FPS",
    width: 2560,
    height: 1440,
    frameRate: 60,
    maxBitrate: 10_000_000,
    contentHint: "detail" as const,
    degradationPreference: "maintain-resolution" as const,
  },
} satisfies Record<ShareProfile, {
  label: string;
  details: string;
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
  contentHint: "detail" | "motion";
  degradationPreference: "maintain-resolution" | "maintain-framerate";
}>;

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
  const isWindowsDesktop =
    isDesktopApp &&
    typeof navigator !== "undefined" &&
    /Windows/i.test(navigator.userAgent);
  const isSharing = isWindowsDesktop ? nativeSharing : isScreenShareEnabled;

  useEffect(() => {
    if (!isWindowsDesktop) return;
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
  }, [isWindowsDesktop, onError]);

  useEffect(() => {
    if (!dialogOpen || !isWindowsDesktop || !nativeSelectedId) {
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
  }, [dialogOpen, isWindowsDesktop, nativeSelectedId]);

  const toggleShare = async () => {
    if (isSharing) {
      try {
        if (isWindowsDesktop) {
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
    if (isWindowsDesktop) {
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
      if (isWindowsDesktop) {
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
            ...(isDesktopApp ? { selfBrowserSurface: "exclude" as const } : {}),
          },
          {
            screenShareEncoding: {
              maxBitrate: selected.maxBitrate,
              maxFramerate: selected.frameRate,
            },
            degradationPreference: selected.degradationPreference,
          },
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
      <button
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
      </button>

      {dialogOpen && (
        <HubDialog
          title="Compartilhar tela"
          onClose={() => setDialogOpen(false)}
          wide={isWindowsDesktop}
        >
          <p className="share-dialog-description">
            {isWindowsDesktop
              ? "Escolha uma janela ou monitor e confira a prévia antes de transmitir."
              : "Escolha o tipo de fonte e a qualidade. Depois, selecione a janela ou o monitor na janela de captura do sistema."}
          </p>

          {isWindowsDesktop ? (
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
                    <button
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
                    </button>
                  );
                })}
                {nativeSources.length === 0 && (
                  <p className="native-share-no-sources">Nenhuma janela ou tela disponível para captura.</p>
                )}
              </div>
            </div>
          ) : (
            <fieldset className="share-source-options">
              <legend>Tipo de fonte</legend>
              <label className={source === "window" ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="screen-share-source"
                  value="window"
                  checked={source === "window"}
                  onChange={() => setSource("window")}
                />
                <AppWindow size={20} aria-hidden="true" />
                <span>
                  <strong>Janela</strong>
                  <small>Um aplicativo por vez</small>
                </span>
              </label>
              <label className={source === "monitor" ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="screen-share-source"
                  value="monitor"
                  checked={source === "monitor"}
                  onChange={() => setSource("monitor")}
                />
                <Monitor size={20} aria-hidden="true" />
                <span>
                  <strong>Tela inteira</strong>
                  <small>O monitor completo</small>
                </span>
              </label>
            </fieldset>
          )}

          <fieldset className="share-quality-options">
            <legend>Qualidade</legend>
            {(Object.keys(shareProfiles) as ShareProfile[]).map((key) => {
              const option = shareProfiles[key];
              return (
                <label
                  key={key}
                  className={profile === key ? "is-selected" : ""}
                >
                  <input
                    type="radio"
                    name="screen-share-profile"
                    value={key}
                    checked={profile === key}
                    onChange={() => setProfile(key)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.details}</small>
                  </span>
                  {profile === key && <i aria-hidden="true" />}
                </label>
              );
            })}
          </fieldset>

          <p className="share-quality-note">
            {isWindowsDesktop
              ? "A captura usa a API nativa do Windows. A qualidade pode variar com a tela e a rede."
              : isDesktopApp
              ? "A qualidade real depende da tela, do Windows e da conexão de quem transmite."
              : "A qualidade real depende do navegador, da tela e da conexão de quem transmite."}
          </p>

          <div className="dialog-actions">
            <button
              className="outline-button"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              onClick={() => void startShare()}
              disabled={starting || (isWindowsDesktop && !nativeSelectedId)}
            >
              <MonitorArrowUp size={17} aria-hidden="true" />
              {starting
                ? "Iniciando…"
                : `Compartilhar ${selectedProfile.details}`}
            </button>
          </div>
        </HubDialog>
      )}
    </>
  );
}

export default function LiveCallRoom({
  token,
  url,
  channelId,
  video,
  audio,
  onLeave,
}: {
  token: string;
  url: string;
  channelId: string;
  video: boolean;
  audio: boolean;
  onLeave: () => void;
}) {
  const room = useMemo(
      () => new Room({ adaptiveStream: true, dynacast: true }),
      [],
    ),
    [error, setError] = useState(""),
    [isDesktopApp, setIsDesktopApp] = useState(false);
  useEffect(() => {
    setIsDesktopApp("__TAURI_INTERNALS__" in window);
  }, []);
  useEffect(() => {
    const failed = () =>
      setError(
        "Não foi possível acessar a câmera, o microfone ou a tela. Confira as permissões do navegador.",
      );
    room.on(RoomEvent.MediaDevicesError, failed);
    return () => {
      room.off(RoomEvent.MediaDevicesError, failed);
      void room.disconnect();
    };
  }, [room]);
  return (
    <section className="live-call" data-lk-theme="default">
      {error && <p role="alert">{error}</p>}
      <LiveKitRoom
        room={room}
        serverUrl={url}
        token={token}
        connect
        audio={audio}
        video={video}
        onDisconnected={onLeave}
        onError={() =>
          setError("A chamada perdeu a conexão. Saia e tente entrar novamente.")
        }
      >
        <div className="call-header">
          <strong>Sala do time</strong>
          <div className="call-header-actions">
            <ScreenShareControl
              room={room}
              channelId={channelId}
              isDesktopApp={isDesktopApp}
              onError={setError}
            />
            <button
              className="secondary-button"
              onClick={() => {
                void room.disconnect();
                onLeave();
              }}
            >
              Sair da chamada
            </button>
          </div>
        </div>
        <VideoConference />
      </LiveKitRoom>
    </section>
  );
}
