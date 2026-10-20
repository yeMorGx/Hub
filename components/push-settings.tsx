"use client";
import { useEffect, useState } from "react";
import { Bell, BellSlash } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { errorMessage } from "@/lib/supabase/errors";
function keyBytes(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function PushSettings({ hub }: { hub: HubController }) {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    enabled = process.env.NEXT_PUBLIC_PUSH_ENABLED === "true";
  const [supported, setSupported] = useState(false),
    [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setSupported(
      "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window,
    );
    if (!enabled || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      let owner = "";
      try {
        owner = localStorage.getItem("hub.push.owner") || "";
      } catch {}
      if (subscription && owner && owner !== hub.userId) {
        await subscription.unsubscribe();
        if (live) setActive(false);
      } else if (live) setActive(Boolean(subscription));
    });
    return () => {
      live = false;
    };
  }, [enabled, hub.userId]);
  if (!enabled || !key || !supported) return null;
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const old = await registration.pushManager.getSubscription();
      if (active && old) {
        await hub.rpc("unregister_push_subscription", {
          p_endpoint: old.endpoint,
        });
        await old.unsubscribe();
        setActive(false);
        try {
          localStorage.removeItem("hub.push.owner");
        } catch {}
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error(
            "Permita as notificações nas configurações do navegador para receber avisos.",
          );
        const subscription =
          old ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(key!),
          }));
        const data = subscription.toJSON();
        if (!data.endpoint || !data.keys)
          throw new Error("Não foi possível registrar este navegador.");
        try {
          await hub.rpc("register_push_subscription", {
            p_endpoint: data.endpoint,
            p_p256dh: data.keys.p256dh,
            p_auth: data.keys.auth,
          });
        } catch (e) {
          if (!old) await subscription.unsubscribe();
          throw e;
        }
        try {
          localStorage.setItem("hub.push.owner", hub.userId);
        } catch {}
        setActive(true);
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message.startsWith("Permita")
          ? e.message
          : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="push-settings">
      <h3>Notificações neste dispositivo</h3>
      <p>
        Receba menções e lembretes. No iPhone, instale a PWA na tela inicial
        para ativar.
      </p>
      <button
        className="outline-button"
        disabled={busy}
        onClick={() => void toggle()}
      >
        {active ? <BellSlash size={16} /> : <Bell size={16} />}
        {busy
          ? "Atualizando…"
          : active
            ? "Desativar notificações"
            : "Ativar notificações"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
