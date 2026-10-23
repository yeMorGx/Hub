"use client";
import { ZuluButton } from "./dashboard-ui";
import { useEffect, useState } from "react";
import { UserPlus, ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { AuthShell } from "./auth/auth-shell";
import type { InvitationPreview } from "@/lib/invitations/types";
export function InvitationScreen({
  configured,
  authenticated,
  mfaReady,
}: {
  configured: boolean;
  authenticated: boolean;
  mfaReady: boolean;
}) {
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<InvitationPreview | null>(null);
  useEffect(() => {
    let live = true;
    async function load() {
      try {
        if (!configured) throw new Error("O ZULU ainda não está configurado.");
        const token = new URLSearchParams(window.location.hash.slice(1)).get(
          "token",
        );
        if (token) {
          const response = await fetch("/api/team-invitations/pending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const result = await response.json();
          window.history.replaceState(null, "", "/invite");
          if (!response.ok) throw new Error(result.error);
        }
        if (!mfaReady) return;
        const response = await fetch("/api/team-invitations/pending", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (live) setPreview(result.invitation);
      } catch (e) {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível abrir o convite.",
          );
      } finally {
        if (live) setLoading(false);
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [configured, mfaReady]);
  async function accept() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/team-invitations/accept", {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      try {
        localStorage.setItem(`hub.team.${result.userId}`, result.teamId);
      } catch {}
      window.location.assign("/");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível aceitar o convite.",
      );
      setBusy(false);
    }
  }
  async function dismiss() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/team-invitations/pending", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      window.location.assign("/");
    } catch {
      setError("Não foi possível fechar o convite. Tente novamente.");
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <span className="auth-step-icon">
        <UserPlus size={28} />
      </span>
      <div className="auth-title">
        <h2>
          {preview
            ? `Seu lugar no time ${preview.team_name}.`
            : "Seu time está esperando."}
        </h2>
        <p>
          {preview
            ? `${preview.workspace_name} convidou você para participar como ${preview.role === "leader" ? "líder" : "membro"}.`
            : "Entre ou crie sua conta com o e-mail que recebeu este convite. Depois, confirme sua identidade para participar."}
        </p>
      </div>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p role="status">
          <CircleNotch className="spinning" /> Conferindo convite…
        </p>
      ) : preview ? (
        <>
          <p className="demo-note">
            Ao aceitar, você poderá acessar as conversas públicas e os recursos
            deste time. Canais privados exigem participação.
          </p>
          <ZuluButton
            className="primary-button auth-submit"
            disabled={busy}
            onClick={() => void accept()}
          >
            Aceitar convite <ArrowRight size={18} />
          </ZuluButton>
        </>
      ) : (
        !error &&
        (!authenticated ? (
          <div className="invitation-actions">
            <a className="primary-button auth-submit" href="/login">
              Já tenho conta <ArrowRight size={18} />
            </a>
            <a className="outline-button auth-submit" href="/login?mode=signup">
              Criar minha conta
            </a>
          </div>
        ) : (
          !mfaReady && (
            <a className="primary-button auth-submit" href="/mfa">
              Confirmar segunda etapa <ArrowRight size={18} />
            </a>
          )
        ))
      )}
      {!loading && (
        <div className="auth-switch">
          {error && <a href="/login">Entrar com outro e-mail</a>}
          <ZuluButton disabled={busy} onClick={() => void dismiss()}>
            Voltar ao ZULU
          </ZuluButton>
        </div>
      )}
    </AuthShell>
  );
}
