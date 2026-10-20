"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  VideoConference,
} from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";
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
  isDesktopApp,
  onError,
}: {
  room: Room;
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

  const toggleShare = async () => {
    if (isScreenShareEnabled) {
      try {
        await localParticipant.setScreenShareEnabled(false);
      } catch {
        onError("Não foi possível parar o compartilhamento. Tente novamente.");
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
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "NotAllowedError")) {
        onError(
          "Não foi possível iniciar. Confira a permissão de captura e tente outra fonte ou qualidade.",
        );
      }
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
        disabled={starting}
        aria-pressed={isScreenShareEnabled}
        title={
          isScreenShareEnabled
            ? "Parar compartilhamento"
            : "Escolher janela, tela e qualidade"
        }
      >
        {isScreenShareEnabled ? (
          <>
            <Stop size={16} aria-hidden="true" />
            Parar compartilhamento
          </>
        ) : (
          <>
            <MonitorArrowUp size={17} aria-hidden="true" />
            {starting ? "Abrindo seletor…" : "Compartilhar tela"}
          </>
        )}
      </button>

      {dialogOpen && (
        <HubDialog
          title="Compartilhar tela"
          onClose={() => setDialogOpen(false)}
        >
          <p className="share-dialog-description">
            Escolha o tipo de fonte e a qualidade. Depois, selecione a janela ou
            o monitor na janela de captura do sistema.
          </p>

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
            {isDesktopApp
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
              disabled={starting}
            >
              <MonitorArrowUp size={17} aria-hidden="true" />
              Compartilhar {selectedProfile.details}
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
  video,
  audio,
  onLeave,
}: {
  token: string;
  url: string;
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
