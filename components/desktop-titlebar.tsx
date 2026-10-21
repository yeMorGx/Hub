"use client";
import { BrandMark } from "./brand";

import { useEffect, useState } from "react";
import { CopySimple, Minus, Square, X } from "@phosphor-icons/react";

type WindowState = { supported: boolean; maximized: boolean };
type Action = "state" | "enable" | "restore" | "minimize" | "toggle_maximize" | "close" | "drag";

async function control(action: Action) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<WindowState>("desktop_titlebar", { action });
}

export function DesktopTitlebar() {
  const [visible, setVisible] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [unread, setUnread] = useState("");

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window) || !/Windows/.test(navigator.userAgent)) return;
    let disposed = false;
    void control("state").then((state) => {
      if (disposed || state?.supported !== true) return;
      setMaximized(state.maximized);
      setVisible(true);
    }).catch(() => { /* Older installers retain their native frame. */ });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    let resizeFrame = 0;
    document.documentElement.dataset.desktopTitlebar = "true";
    // Keep the OS controls until the replacement is mounted.
    const frame = requestAnimationFrame(() => {
      void control("enable").then(() => {
        if (disposed) void control("restore").catch(() => {});
      }).catch(() => {
        delete document.documentElement.dataset.desktopTitlebar;
        setVisible(false);
      });
    });
    const resize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        void control("state").then((state) => {
          if (!disposed) setMaximized(state.maximized);
        }).catch(() => {});
      });
    };
    const title = () => setUnread(document.title.match(/^\((\d+\+?)\)/)?.[1] ?? "");
    title();
    const observer = new MutationObserver(title);
    const element = document.querySelector("title");
    if (element) observer.observe(element, { childList: true, characterData: true, subtree: true });
    window.addEventListener("resize", resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      delete document.documentElement.dataset.desktopTitlebar;
      void control("restore").catch(() => {});
    };
  }, [visible]);

  if (!visible) return null;
  const act = async (action: Action) => {
    try {
      const state = await control(action);
      setMaximized(state.maximized);
    } catch {
      // Restore standard OS controls if a custom action is unavailable.
      await control("restore").catch(() => {});
      setVisible(false);
    }
  };
  return (
    <header className="desktop-titlebar" aria-label="Barra de título do ZULU">
      <div className="desktop-titlebar-drag"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          void act(event.detail === 2 ? "toggle_maximize" : "drag");
        }}>
        <BrandMark size={24} />

        {unread && <span className="desktop-titlebar-unread" aria-label={`${unread} mensagens não lidas`}>{unread}</span>}
      </div>
      <div className="desktop-window-controls" role="group" aria-label="Controles da janela">
        <button type="button" aria-label="Minimizar janela" title="Minimizar" onClick={() => void act("minimize")}><Minus size={14} aria-hidden="true" /></button>
        <button type="button" aria-label={maximized ? "Restaurar janela" : "Maximizar janela"} title={maximized ? "Restaurar" : "Maximizar"} onClick={() => void act("toggle_maximize")}>
          {maximized ? <CopySimple size={13} aria-hidden="true" /> : <Square size={12} aria-hidden="true" />}
        </button>
        <button type="button" className="desktop-window-close" aria-label="Fechar ZULU" title="Fechar" onClick={() => void act("close")}><X size={15} aria-hidden="true" /></button>
      </div>
    </header>
  );
}
