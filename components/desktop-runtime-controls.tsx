"use client";
import { useEffect, useState } from "react";
import { Popover, Button, Spinner } from "@heroui/react";
import { DotsThree, Timer, Power } from "@phosphor-icons/react";
import {
  DashboardUIProvider,
  ZuluButton,
  ZuluCheckboxField,
} from "./dashboard-ui";
import {
  desktopRuntime,
  isDesktopRuntime,
  type RuntimeState,
} from "@/lib/desktop/runtime";
export function DesktopRuntimeControls({ fallbackOnly = false }: { fallbackOnly?: boolean }) {
  const [chromePresent, setChromePresent] = useState(false);
  const [state, setState] = useState<RuntimeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () => setChromePresent(Boolean(document.documentElement.dataset.desktopAppChrome));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-desktop-app-chrome"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!isDesktopRuntime() || window.location.pathname === "/desktop/timer")
      return;
    let disposed = false;
    void desktopRuntime("state")
      .then((value) => {
        if (!disposed && value.supported) setState(value);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, []);
  if (!state || (fallbackOnly && chromePresent)) return null;
  const change = async (
    action: Parameters<typeof desktopRuntime>[0],
    enabled?: boolean,
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setState(await desktopRuntime(action, enabled));
    } catch {
      setError("Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <DashboardUIProvider enabled>
      <div className="desktop-runtime-tools">
        <ZuluButton
          className="desktop-quick-mini"
          aria-label="Abrir mini timer"
          disabled={busy}
          onClick={() => void change("show_mini")}
        >
          <Timer size={18} />
        </ZuluButton>
        <Popover
          isOpen={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (value) void change("state");
          }}
        >
          <Button
            className="desktop-options-trigger"
            variant="tertiary"
            aria-label="Opções do aplicativo"
          >
            <DotsThree size={21} />
          </Button>
          <Popover.Content
            className="zulu-overlay desktop-runtime-popover"
            placement="bottom end"
          >
            <Popover.Dialog aria-label="Opções do aplicativo">
              <strong>ZULU no seu PC</strong>
              <ZuluCheckboxField
                aria-label="Abrir ao ligar o PC"
                checked={state.autostart}
                disabled={busy}
                onCheckedChange={(enabled) =>
                  void change("set_autostart", enabled)
                }
              >
                Abrir ao ligar o PC
              </ZuluCheckboxField>
              <p>
                {state.background
                  ? "Ao fechar, o ZULU continua na bandeja."
                  : "A bandeja não está disponível nesta sessão."}
              </p>
              <ZuluButton
                className="desktop-option-row"
                disabled={busy}
                onClick={() =>
                  void change(state.miniVisible ? "hide_mini" : "show_mini")
                }
              >
                <Timer size={16} />
                {state.miniVisible
                  ? "Ocultar mini timer"
                  : "Mostrar mini timer"}
              </ZuluButton>
              <ZuluButton
                className="desktop-option-row"
                disabled={busy}
                onClick={() => void change("quit")}
              >
                <Power size={16} />
                Sair do ZULU
              </ZuluButton>
              {busy && (
                <Spinner size="sm" aria-label="Atualizando preferência" />
              )}
              {error && <p role="alert">{error}</p>}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>
    </DashboardUIProvider>
  );
}
