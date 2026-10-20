"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  TrackToggle,
  VideoConference,
} from "@livekit/components-react";
import { Room, RoomEvent, Track } from "livekit-client";
import { MonitorArrowUp, Stop } from "@phosphor-icons/react";
import "@livekit/components-styles";
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
    [error, setError] = useState("");
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
            <TrackToggle
              source={Track.Source.ScreenShare}
              showIcon={false}
              className="call-screen-share-toggle"
              title="Até 1440p e 60 FPS, conforme o navegador e a conexão"
              captureOptions={{
                resolution: { width: 2560, height: 1440, frameRate: 60 },
                contentHint: "detail",
              }}
              publishOptions={{
                screenShareEncoding: {
                  maxBitrate: 10_000_000,
                  maxFramerate: 60,
                },
                degradationPreference: "balanced",
              }}
              onDeviceError={() =>
                setError(
                  "Não foi possível iniciar o compartilhamento. Confira as permissões de captura de tela do navegador.",
                )
              }
            >
              <MonitorArrowUp
                className="call-screen-share-start-icon"
                size={17}
                aria-hidden="true"
              />
              <Stop
                className="call-screen-share-stop-icon"
                size={16}
                aria-hidden="true"
              />
              <span className="call-screen-share-start-label">
                Compartilhar tela
              </span>
              <span className="call-screen-share-stop-label">
                Parar compartilhamento
              </span>
            </TrackToggle>
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
