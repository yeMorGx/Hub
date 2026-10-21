"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
/** The same app controls move into the native title bar; browsers retain their header. */
export function DesktopChrome({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () =>
      setTarget(
        document.documentElement.dataset.desktopTitlebar
          ? document.getElementById("desktop-titlebar-content")
          : null,
      );
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-desktop-titlebar"],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (target) document.documentElement.dataset.desktopAppChrome = "true";
    return () => {
      delete document.documentElement.dataset.desktopAppChrome;
    };
  }, [target]);
  return target ? createPortal(children, target) : children;
}
