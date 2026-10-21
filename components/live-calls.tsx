"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Headphones,
  VideoCamera,
  Microphone,
  MonitorArrowUp,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { errorMessage } from "@/lib/supabase/errors";
const CallRoom = dynamic(() => import("./live-call-room"), {
  ssr: false,
  loading: () => <p role="status">Preparando chamada…</p>,
});
export function LiveCalls({
  hub,
  demo = false,
}: {
  hub: HubController;
  demo?: boolean;
}) {
  const [channel, setChannel] = useState(""),
    [video, setVideo] = useState(false),
    [audio, setAudio] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [enabled, setEnabled] = useState<boolean | null>(null),
    [call, setCall] = useState<{
      token: string;
      url: string;
      room: string;
    } | null>(null);
  const alive = useRef(true);
  const [statusError, setStatusError] = useState("");
  const [statusAttempt, setStatusAttempt] = useState(0);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    setEnabled(null);
    setStatusError("");
    if (demo) {
      setEnabled(false);
      return () => {
        alive.current = false;
        controller.abort();
      };
    }
    fetch("/api/integrations/status", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sua sessão expirou. Entre novamente para acessar as chamadas."
              : "Não foi possível conferir o serviço de chamadas. Tente novamente.",
          );
        const result = await response.json();
        if (typeof result.livekit !== "boolean")
          throw new Error(
            "Resposta inválida do serviço de chamadas. Tente novamente.",
          );
        if (!controller.signal.aborted) setEnabled(result.livekit);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setStatusError(
            e instanceof Error
              ? e.message
              : "Não foi possível conectar ao serviço de chamadas.",
          );
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [statusAttempt, demo]);
  useEffect(() => {
    if (!call || !channel) return;
    let checking = false;
    const controller = new AbortController();
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/livekit/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: channel }),
          signal: controller.signal,
        });
        if (!response.ok && !controller.signal.aborted) {
          setCall(null);
          setError("Seu acesso ao canal mudou. A chamada foi encerrada.");
        }
      } catch {
        if (controller.signal.aborted) return;
        setCall(null);
        setError(
          "Não foi possível confirmar seu acesso à sala. Entre novamente.",
        );
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(check, 20000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [call, channel, hub.client, hub.userId]);
  const availableChannels = hub.snapshot.channels.filter(
    (c) =>
      !c.archived_at &&
      hub.snapshot.channelMemberships.some((m) => m.channel_id === c.id),
  );
  const channelReady =
    availableChannels.some((c) => c.id === channel) && hub.canParticipate;
  async function join() {
    if (busy || !channelReady || !enabled) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (!alive.current) return;
        setError(
          typeof data.error === "string"
            ? data.error
            : "Não foi possível entrar na chamada.",
        );
        return;
      }
      if (alive.current) setCall(data);
    } catch (e) {
      if (alive.current) setError(errorMessage(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  if (call)
    return (
      <CallRoom
        token={call.token}
        url={call.url}
        channelId={channel}
        video={video}
        audio={audio}
        onLeave={() => setCall(null)}
      />
    );
  return (
    <section className="workspace-module calls-module">
      <span className="eyebrow">UMA CONVERSA, AO VIVO</span>
      <h2>Junte o time na mesma sala.</h2>
      <p>
        Voz, vídeo e tela compartilhada para resolver o que precisa de uma
        conversa.
      </p>
      <div className="call-lobby">
        <div className="call-lobby-visual">
          <div className="call-orbit">
            <Headphones size={52} />
          </div>
          <span>Sua câmera e seu microfone começam sob seu controle.</span>
        </div>
        <div className="call-lobby-controls">
          <h3>Preparar chamada</h3>
          <label>
            Canal
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={busy}
            >
              <option value="">Escolha onde conversar</option>
              {availableChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kind === "dm" ? "Conversa direta" : `#${c.name}`}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={audio}
              onChange={(e) => setAudio(e.target.checked)}
            />
            <Microphone size={18} />
            Entrar com microfone
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={video}
              onChange={(e) => setVideo(e.target.checked)}
            />
            <VideoCamera size={18} />
            Entrar com câmera
          </label>
          {enabled === null && !statusError && (
            <p role="status" className="muted">
              Conferindo serviço de chamadas…
            </p>
          )}
          {statusError && (
            <div role="alert" className="form-error">
              <p>{statusError}</p>
              <button
                className="text-button"
                onClick={() => setStatusAttempt((attempt) => attempt + 1)}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {!availableChannels.length && (
            <p className="muted">
              Entre em um canal do time para participar de uma chamada.
            </p>
          )}
          {enabled === false && (
            <p className="inline-notice">
              {demo
                ? "Esta é uma prévia. Entre no ZULU para usar as chamadas do seu time."
                : "As chamadas aguardam a configuração do LiveKit pelo administrador."}
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            disabled={busy || !channelReady || !enabled}
            onClick={join}
          >
            {busy ? "Conectando…" : "Entrar na sala"}
          </button>
          <small className="muted">
            <MonitorArrowUp size={16} /> Compartilhe uma janela ou sua tela
            durante a chamada.
          </small>
        </div>
      </div>
    </section>
  );
}
