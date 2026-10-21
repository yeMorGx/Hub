"use client";
import { useEffect, useRef, useState } from "react";
import {
  Coffee,
  Play,
  Stop,
  X,
  DotsSixVertical,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { DashboardUIProvider, ZuluButton } from "./dashboard-ui";
import AnimatedGradient from "./animated-gradient";
import { clock } from "@/lib/hub/dates";
import { isDesktopRuntime, type MiniState } from "@/lib/desktop/runtime";
const PRISM = { preset: "Prism" } as const,
  LAVA = { preset: "Lava" } as const;
export function DesktopMiniTimer() {
  const [timer, setTimer] = useState<MiniState | null>(null),
    [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const actionLock = useRef(false);
  async function command(action: string) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<MiniState>("desktop_mini", { action });
  }
  useEffect(() => {
    if (!isDesktopRuntime()) return;
    let disposed = false,
      inflight = false,
      stop: (() => void) | undefined;
    const read = async () => {
      if (inflight) return;
      inflight = true;
      try {
        const next = await command("state");
        if (!disposed) {
          setTimer(next);
          setError(next.error ?? "");
        }
      } catch {
        if (!disposed) setError("Abra o ZULU para reconectar.");
      } finally {
        inflight = false;
      }
    };
    void read();
    const poll = setInterval(() => {
      if (!document.hidden) void read();
    }, 1000);
    void import("@tauri-apps/api/event")
      .then(async ({ listen }) => {
        const cleanup = await listen("zulu:timer-changed", () => void read());
        if (disposed) cleanup();
        else stop = cleanup;
      })
      .catch(() => {});
    document.addEventListener("visibilitychange", read);
    return () => {
      disposed = true;
      clearInterval(poll);
      stop?.();
      document.removeEventListener("visibilitychange", read);
    };
  }, []);
  const act = async (action: string) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPending(true);
    setError("");
    try {
      setTimer(await command(action));
    } catch {
      setError("Não foi possível concluir. Abra o ZULU.");
    } finally {
      window.setTimeout(() => {
        actionLock.current = false;
        setPending(false);
      }, 500);
    }
  };
  return (
    <DashboardUIProvider enabled>
      <main
        className={`desktop-mini-page ${timer?.phase === "running" ? "mini-running" : ""}`}
      >
        <section className="mini-capsule" aria-label="Mini timer do ZULU">
          <div className="mini-gradient" aria-hidden="true">
            <AnimatedGradient
              config={PRISM}
              active={timer?.phase !== "running"}
            />
            <AnimatedGradient
              config={LAVA}
              active={timer?.phase === "running"}
              className="mini-lava"
            />
          </div>
          <ZuluButton
            className="mini-grab"
            aria-label="Mover mini timer"
            onPointerDown={(event) => {
              if (event.button === 0) void command("drag").catch(() => {});
            }}
          >
            <DotsSixVertical size={14} />
          </ZuluButton>
          <ZuluButton
            className="mini-clock"
            aria-label="Abrir ZULU"
            onClick={() => void act("open_main")}
          >
            <span role="timer" aria-label="Tempo da atividade">
              {clock(timer?.elapsedSeconds ?? 0)}
            </span>
            <small>
              {timer
                ? timer.phase === "running"
                  ? "Em foco"
                  : timer.phase === "lunch"
                    ? "Almoço"
                    : "Sem atividade"
                : "Abra pelo ZULU"}
            </small>
          </ZuluButton>
          <ZuluButton
            className="mini-action"
            aria-label={
              timer?.phase === "lunch"
                ? "Retomar trabalho"
                : "Pausar para almoço"
            }
            disabled={
              !timer?.canControl ||
              timer?.busy ||
              pending ||
              timer.phase === "idle"
            }
            onClick={() =>
              void act(timer?.phase === "lunch" ? "resume" : "pause")
            }
          >
            {timer?.phase === "lunch" ? (
              <Play size={17} weight="fill" />
            ) : (
              <Coffee size={19} />
            )}
          </ZuluButton>
          <ZuluButton
            className="mini-action"
            aria-label="Encerrar e salvar"
            disabled={
              !timer?.canControl ||
              timer?.busy ||
              pending ||
              timer.phase === "idle"
            }
            onClick={() => void act("stop")}
          >
            <Stop size={15} weight="fill" />
          </ZuluButton>
          <ZuluButton
            className="mini-dismiss"
            aria-label="Ocultar mini timer"
            onClick={() => void act("hide")}
          >
            <X size={14} />
          </ZuluButton>
          {error && (
            <ZuluButton
              className="mini-error"
              aria-label={error}
              onClick={() => void act("open_main")}
            >
              <ArrowUpRight size={15} />
              <span role="alert">{error}</span>
            </ZuluButton>
          )}
        </section>
      </main>
    </DashboardUIProvider>
  );
}
