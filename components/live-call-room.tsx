"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Room, RoomEvent } from "livekit-client";
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
        "Não foi possível acessar a câmera ou o microfone. Confira as permissões do navegador.",
      );
    room.on(RoomEvent.MediaDevicesError, failed);
    return () => {
      room.off(RoomEvent.MediaDevicesError, failed);
      void room.disconnect();
    };
  }, [room]);
  return (
    <section className="live-call" data-lk-theme="default">
      <div className="call-header">
        <strong>Sala do time</strong>
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
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </section>
  );
}
