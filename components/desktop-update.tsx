"use client";

import { useEffect, useState } from "react";
import { isNewerVersion, versionParts } from "@/lib/desktop/updates";

const currentBuildId = process.env.NEXT_PUBLIC_HUB_BUILD_ID ?? "local";
const fiveMinutes = 5 * 60 * 1000;
const oneHour = 60 * 60 * 1000;

export function DesktopUpdate() {
  const [version, setVersion] = useState<string | null>(null);
  const [webBuild, setWebBuild] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [phase, setPhase] = useState<"idle" | "preparing" | "downloading" | "installing">("idle");
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window) || !/Windows/.test(navigator.userAgent))
      return;

    let disposed = false;
    let checkingWeb = false;
    let checkingRelease = false;
    let lastWebCheck = 0;
    let lastReleaseCheck = 0;

    const checkWebBuild = async () => {
      if (
        checkingWeb ||
        Date.now() - lastWebCheck < fiveMinutes ||
        document.visibilityState === "hidden"
      )
        return;

      checkingWeb = true;
      lastWebCheck = Date.now();
      try {
        const response = await fetch("/api/app-version", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (!result || typeof result !== "object") return;
        const buildId = (result as Record<string, unknown>).buildId;
        if (
          !disposed &&
          typeof buildId === "string" &&
          buildId !== currentBuildId &&
          sessionStorage.getItem("hub-web-update-dismissed") !== buildId
        ) {
          setWebBuild(buildId);
        }
      } catch {
        // Offline checks must not interrupt work.
      } finally {
        checkingWeb = false;
      }
    };

    const checkDesktopRelease = async () => {
      if (
        checkingRelease ||
        Date.now() - lastReleaseCheck < oneHour ||
        document.visibilityState === "hidden"
      )
        return;

      checkingRelease = true;
      lastReleaseCheck = Date.now();
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        let supported = false;
        try { supported = await invoke<boolean>("desktop_updater_supported") === true; } catch { /* Installers before 0.1.3 use the manual bridge. */ }
        if (supported) {
          if (!disposed) setAutomatic(true);
          const release = await invoke<{ version: string } | null>("check_desktop_update");
          if (!disposed && release && versionParts(release.version) && sessionStorage.getItem("hub-update-dismissed") !== release.version) {
            setVersion(release.version);
          }
          return;
        }
        const { getVersion } = await import("@tauri-apps/api/app");
        const current = await getVersion();
        const response = await fetch("/api/desktop/update", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (!result || typeof result !== "object") return;
        const release = (result as Record<string, unknown>).release;
        if (
          !disposed &&
          release &&
          typeof release === "object" &&
          typeof (release as Record<string, unknown>).version === "string"
        ) {
          const releaseVersion = (release as Record<string, string>).version;
          if (
            versionParts(releaseVersion) &&
            isNewerVersion(releaseVersion, current) &&
            sessionStorage.getItem("hub-update-dismissed") !== releaseVersion
          ) {
            setVersion(releaseVersion);
          }
        }
      } catch {
        // Offline checks and legacy installers must not interrupt work.
      } finally {
        checkingRelease = false;
      }
    };

    const check = () => {
      void checkWebBuild();
      void checkDesktopRelease();
    };

    check();
    const interval = window.setInterval(check, fiveMinutes);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);

    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!version && !webBuild) return null;

  return (
    <aside className="desktop-update" aria-label="Atualização do Hub">
      {version ? (
        <>
          <div role="status">
            <strong>Hub {version} disponível</strong>
            <p>
              {automatic
                ? "Salve o que estiver editando. O Hub vai baixar a atualização, instalar e abrir novamente. Sua conta e os dados do time são mantidos."
                : "Instale esta versão uma vez para habilitar as próximas atualizações pelo próprio Hub. Sua conta e os dados do time são mantidos."}
            </p>
          </div>
          {phase !== "idle" && <div role="status" aria-live="polite">
            <p>{phase === "preparing" ? "Preparando atualização…" : phase === "installing" ? "Instalando… O Hub será reiniciado." : `Baixando atualização${percent === null ? "…" : `: ${percent}%`}`}</p>
            {phase === "downloading" && <progress aria-label="Download da atualização" max={100} value={percent ?? undefined} />}
          </div>}
          {error && (
            <p role="alert">{automatic ? "Não foi possível concluir a atualização. Tente novamente." : "Não foi possível abrir o download. Tente novamente."}</p>
          )}
          <div className="desktop-update-actions">
            <button
              className="outline-button"
              disabled={opening}
              onClick={() => {
                sessionStorage.setItem("hub-update-dismissed", version);
                setVersion(null);
              }}
            >
              Depois
            </button>
            <button
              className="primary-button"
              disabled={opening}
              onClick={async () => {
                setOpening(true);
                setError(false);
                let unlisten: (() => void) | undefined;
                try {
                  const { invoke } = await import("@tauri-apps/api/core");
                  if (automatic) {
                    setPhase("preparing");
                    setPercent(null);
                    const { listen } = await import("@tauri-apps/api/event");
                    unlisten = await listen<{ phase: string; downloaded: number; total: number | null }>("hub:desktop-update", ({ payload }) => {
                      if (payload.phase === "installing") setPhase("installing");
                      else if (payload.phase === "downloading") {
                        setPhase("downloading");
                        setPercent(payload.total && payload.total > 0 ? Math.min(100, Math.floor(payload.downloaded / payload.total * 100)) : null);
                      }
                    });
                    await invoke("install_desktop_update", { version });
                  } else {
                    await invoke("open_desktop_update", { version });
                  }
                } catch {
                  setError(true);
                  setPhase("idle");
                } finally {
                  unlisten?.();
                  setOpening(false);
                }
              }}
            >
              {opening ? (automatic ? "Atualizando…" : "Abrindo…") : automatic ? "Instalar e reiniciar" : "Baixar atualização"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div role="status">
            <strong>Melhorias disponíveis</strong>
            <p>Recarregue para aplicar as mudanças da interface. Esta atualização não precisa de instalação.</p>
          </div>
          <div className="desktop-update-actions">
            <button
              className="outline-button"
              onClick={() => {
                if (webBuild) {
                  sessionStorage.setItem("hub-web-update-dismissed", webBuild);
                }
                setWebBuild(null);
              }}
            >
              Depois
            </button>
            <button
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Aplicar melhorias
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
