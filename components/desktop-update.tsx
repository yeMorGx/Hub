"use client";
import { useEffect, useState } from "react";
import { isNewerVersion, versionParts } from "@/lib/desktop/updates";
export function DesktopUpdate() {
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window) || !/Windows/.test(navigator.userAgent)) return;
    let disposed = false, running = false, lastCheck = 0;
    const check = async () => {
      if (running || Date.now() - lastCheck < 300000 || document.visibilityState === "hidden") return;
      running = true;
      lastCheck = Date.now();
      try {
        const { getVersion } = await import("@tauri-apps/api/app");
        const current = await getVersion();
        const response = await fetch("/api/desktop/update", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok) return;
        const { release } = await response.json();
        if (!disposed && release && typeof release.version === "string" && versionParts(release.version) && isNewerVersion(release.version, current) && sessionStorage.getItem("hub-update-dismissed") !== release.version) setVersion(release.version);
      } catch { /* Offline checks and legacy installers must not interrupt work. */ }
      finally { running = false; }
    };
    void check();
    const interval = window.setInterval(() => void check(), 3600000);
    const focus = () => void check();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { disposed = true; clearInterval(interval); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, []);
  if (!version) return null;
  return <aside className="desktop-update" aria-label="Atualização do Hub">
    <div role="status"><strong>Hub {version} disponível</strong><p>Baixe a nova versão e execute o instalador quando puder. Sua conta e os dados do time são mantidos.</p></div>
    {error && <p role="alert">Não foi possível abrir o download. Tente novamente.</p>}
    <div className="desktop-update-actions">
      <button className="outline-button" onClick={() => { sessionStorage.setItem("hub-update-dismissed", version); setVersion(null); }}>Depois</button>
      <button className="primary-button" disabled={opening} onClick={async () => {
        setOpening(true); setError(false);
        try { const { invoke } = await import("@tauri-apps/api/core"); await invoke("open_desktop_update", { version }); }
        catch { setError(true); }
        finally { setOpening(false); }
      }}>{opening ? "Abrindo…" : "Baixar atualização"}</button>
    </div>
  </aside>;
}
