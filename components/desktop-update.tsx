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
              Baixe a nova versão e execute o instalador quando puder. Sua
              conta e os dados do time são mantidos.
            </p>
          </div>
          {error && (
            <p role="alert">Não foi possível abrir o download. Tente novamente.</p>
          )}
          <div className="desktop-update-actions">
            <button
              className="outline-button"
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
                try {
                  const { invoke } = await import("@tauri-apps/api/core");
                  await invoke("open_desktop_update", { version });
                } catch {
                  setError(true);
                } finally {
                  setOpening(false);
                }
              }}
            >
              {opening ? "Abrindo…" : "Baixar atualização"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div role="status">
            <strong>Nova versão do Hub disponível</strong>
            <p>Atualize agora para carregar as mudanças publicadas no app.</p>
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
              Atualizar agora
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
