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
export function LiveCalls({ hub }: { hub: HubController }) {
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
  useEffect(() => {
    alive.current = true;
    fetch("/api/integrations/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (alive.current) setEnabled(Boolean(r.livekit));
      })
      .catch(() => {
        if (alive.current) setEnabled(false);
      });
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!call || !channel) return;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch("/api/livekit/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: channel }),
        });
        if (!response.ok) {
          setCall(null);
          setError("Seu acesso ao canal mudou. A chamada foi encerrada.");
        }
      } catch {
        setCall(null);
        setError(
          "Não foi possível confirmar seu acesso à sala. Entre novamente.",
        );
      } finally {
        checking = false;
      }
    };
    const timer = setInterval(check, 20000);
    return () => clearInterval(timer);
  }, [call, channel, hub.client, hub.userId]);
  async function join() {
    if (busy || !channel) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
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
              {hub.snapshot.channels
                .filter((c) => !c.archived_at)
                .map((c) => (
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
          {enabled === false && (
            <p className="inline-notice">
              As chamadas aguardam a configuração do LiveKit pelo administrador.
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            className="primary-button"
            disabled={busy || !channel || !enabled}
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
