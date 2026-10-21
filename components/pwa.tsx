"use client";
import { useEffect, useState } from "react";
import { DownloadSimple, CheckCircle } from "@phosphor-icons/react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let deferredInstall: InstallEvent | null = null;
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* Installation is optional; online app remains usable. */
        });
    }
    const before = (event: Event) => {
      event.preventDefault();
      deferredInstall = event as InstallEvent;
      window.dispatchEvent(new Event("hub-install-ready"));
    };
    const installed = () => {
      deferredInstall = null;
      window.dispatchEvent(new Event("hub-install-ready"));
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  return null;
}
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(false),
    [ios, setIos] = useState(false);
  useEffect(() => {
    const sync = () => {
      setPrompt(deferredInstall);
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    };
    sync();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const added = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("hub-install-ready", sync);
    window.addEventListener("appinstalled", added);
    return () => {
      window.removeEventListener("hub-install-ready", sync);
      window.removeEventListener("appinstalled", added);
    };
  }, []);
  if (installed)
    return (
      <p className="pwa-status">
        <CheckCircle size={16} />
        ZULU instalado neste dispositivo.
      </p>
    );
  if (ios)
    return (
      <p className="pwa-status">
        Para instalar no iPhone/iPad, use Compartilhar → Adicionar à Tela de
        Início no Safari.
      </p>
    );
  if (!prompt) return null;
  return (
    <button
      className="outline-button"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        deferredInstall = null;
        setPrompt(null);
      }}
    >
      <DownloadSimple size={17} />
      Instalar ZULU neste dispositivo
    </button>
  );
}
