"use client";
import { ZuluButton } from "./dashboard-ui";
import { useEffect, useState } from "react";
import { Bell, BellSlash } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { errorMessage } from "@/lib/supabase/errors";
type PushStep =
  | "permission"
  | "worker"
  | "subscription"
  | "registration"
  | "removal";
function pushError(error: unknown, step: PushStep, brave: boolean) {
  const name = error instanceof Error ? error.name : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  if (step === "permission" || name === "NotAllowedError")
    return "Permita as notificações do ZULU nas configurações do navegador e tente novamente.";
  if (step === "worker")
    return "O serviço de notificações da página não iniciou. Recarregue o ZULU e tente novamente.";
  if (step === "subscription" && name === "AbortError")
    return brave
      ? "O Brave não conseguiu acessar o serviço push. Em brave://settings/privacy, ative “Usar serviços do Google para mensagens push”, recarregue o ZULU e tente novamente."
      : "O serviço push do navegador não respondeu. Confira as configurações de notificações e sua conexão e tente novamente.";
  if (name === "NotSupportedError" || name === "SecurityError")
    return "Este navegador não permite notificações push neste contexto. Abra o ZULU diretamente em um navegador atualizado.";
  if (step === "subscription" && name === "InvalidStateError")
    return "A inscrição de notificações deste navegador está desatualizada. Remova a permissão de notificações do ZULU nas configurações do navegador e tente ativar novamente.";
  if (message === "Limite de dispositivos atingido")
    return "Sua conta atingiu o limite de dez dispositivos. Desative as notificações em um deles e tente novamente.";
  if (message === "Endpoint push inválido")
    return "O serviço push deste navegador ainda não é aceito pelo ZULU. Tente em outro navegador atualizado.";
  const reviewed = errorMessage(error);
  if (
    reviewed !== "Não foi possível concluir. Confira os dados e tente novamente."
  )
    return reviewed;
  return step === "registration"
    ? "O navegador criou a inscrição, mas o ZULU não conseguiu salvar este dispositivo. Recarregue a página e tente novamente."
    : step === "removal"
      ? "Não foi possível desativar as notificações. Tente novamente."
      : "O navegador não conseguiu criar a inscrição de notificações. Confira as configurações de notificações e tente novamente.";
}
async function readyRegistration() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Service worker unavailable")),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function keyBytes(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function PushSettings({ hub }: { hub: HubController }) {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    enabled = process.env.NEXT_PUBLIC_PUSH_ENABLED === "true";
  const [supported, setSupported] = useState(false),
    [brave, setBrave] = useState(false),
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
    const browser = navigator as Navigator & {
      brave?: { isBrave: () => Promise<boolean> };
    };
    void browser.brave
      ?.isBrave()
      .then((value) => {
        if (live) setBrave(value);
      })
      .catch(() => {});
    if (enabled && "serviceWorker" in navigator && "PushManager" in window)
      void navigator.serviceWorker.ready
        .then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          let owner = "";
          try {
            owner = localStorage.getItem("hub.push.owner") || "";
          } catch {}
          if (subscription && owner && owner !== hub.userId) {
            await subscription.unsubscribe();
            if (live) setActive(false);
          } else if (live)
            setActive(Boolean(subscription && owner === hub.userId));
        })
        .catch((e) => {
          if (live) setError(pushError(e, "subscription", false));
        });
    return () => {
      live = false;
    };
  }, [enabled, hub.userId]);
  if (!enabled || !key || !supported) return null;
  async function toggle() {
    setBusy(true);
    setError("");
    let step: PushStep = active ? "removal" : "permission";
    try {
      // Request permission during the click, before awaiting service-worker work.
      if (!active) {
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error("Push permission not granted");
      }
      step = "worker";
      const registration = await readyRegistration();
      step = "subscription";
      const old = await registration.pushManager.getSubscription();
      if (active && old) {
        step = "removal";
        await hub.rpc("unregister_push_subscription", {
          p_endpoint: old.endpoint,
        });
        await old.unsubscribe();
        setActive(false);
        try {
          localStorage.removeItem("hub.push.owner");
        } catch {}
      } else {
        const subscription =
          old ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(key!),
          }));
        const data = subscription.toJSON();
        if (!data.endpoint || !data.keys)
          throw new Error("Não foi possível registrar este navegador.");
        step = "registration";
        try {
          await hub.rpc("register_push_subscription", {
            p_endpoint: data.endpoint,
            p_p256dh: data.keys.p256dh,
            p_auth: data.keys.auth,
          });
        } catch (e) {
          if (!old) await subscription.unsubscribe().catch(() => {});
          throw e;
        }
        try {
          localStorage.setItem("hub.push.owner", hub.userId);
        } catch {}
        setActive(true);
      }
    } catch (e) {
      setError(pushError(e, step, brave));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="push-settings">
      <h3>Notificações neste dispositivo</h3>
      <p>
        Receba mensagens diretas, menções e lembretes. No iPhone, instale a PWA
        na tela inicial para ativar.
      </p>
      <ZuluButton
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
      </ZuluButton>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
