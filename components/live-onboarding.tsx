"use client";
import { useState, type FormEvent } from "react";
import {
  SquaresFour,
  ArrowRight,
  SignOut,
  CircleNotch,
  Copy,
  CheckCircle,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { AuthShell } from "./auth/auth-shell";
import { errorMessage } from "@/lib/supabase/errors";
export function LiveOnboarding({ hub }: { hub: HubController }) {
  const [workspaceId, setWorkspaceId] = useState(""),
    [createdWorkspace, setCreatedWorkspace] = useState(""),
    [error, setError] = useState("");
  const admins =
    hub.bootstrap?.workspaces.filter((w) =>
      hub.bootstrap!.workspaceMemberships.some(
        (m) => m.workspace_id === w.id && m.role === "admin" && m.is_active,
      ),
    ) ?? [];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError("");
    const result = await hub.mutate(async () => {
      let wid = workspaceId || createdWorkspace;
      if (!wid) {
        wid = await hub.rpc("create_workspace", {
          p_name: String(data.get("workspace")).trim(),
        });
        setCreatedWorkspace(wid);
      }
      const team = await hub.rpc("create_team", {
        p_workspace_id: wid,
        p_name: String(data.get("team")).trim(),
      });
      // A successfully created team is usable even if the optional initial channel fails.
      try {
        await hub.rpc("create_channel", {
          p_team_id: team,
          p_name: "geral",
          p_kind: "public",
        });
      } catch {
        hub.notify("Time criado. Crie o primeiro canal em Conversas.", true);
      }
      hub.setTeamId(team);
      return team;
    }, "Seu espaço está pronto. Bem-vindo ao Hub!");
    if (!result.ok)
      setError(
        "Não foi possível concluir. O workspace já criado será reaproveitado ao tentar novamente.",
      );
  }
  async function signOut() {
    const { error } = await hub.client.auth.signOut({ scope: "local" });
    if (error) setError(errorMessage(error));
    else window.location.replace("/login");
  }
  return (
    <AuthShell>
      <span className="auth-step-icon">
        <SquaresFour size={28} />
      </span>
      <div className="auth-title">
        <h2>Vamos preparar seu espaço.</h2>
        <p>
          Olá, {hub.bootstrap?.profile.display_name.split(" ")[0]}. Crie um
          workspace e seu primeiro time, ou compartilhe seu identificador com o
          administrador para receber acesso.
        </p>
      </div>
      {error && (
        <div role="alert" className="form-alert">
          {error}
        </div>
      )}
      <form className="auth-form" onSubmit={submit}>
        {admins.length > 0 && (
          <label>
            Workspace
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              disabled={hub.busy || !!createdWorkspace}
            >
              <option value="">Criar novo workspace</option>
              {admins.map((w) => (
                <option value={w.id} key={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {!workspaceId && !createdWorkspace && (
          <label>
            Nome do workspace
            <input
              name="workspace"
              required
              maxLength={120}
              placeholder="Nome da sua organização"
            />
          </label>
        )}
        {createdWorkspace && (
          <div className="form-success">
            <CheckCircle size={18} />
            Workspace criado. Agora conclua seu time.
          </div>
        )}
        <label>
          Nome do time
          <input
            name="team"
            required
            maxLength={120}
            placeholder="Ex.: Produto"
          />
        </label>
        <p className="demo-note">
          O time terá um canal público #geral para começar as conversas.
        </p>
        <button className="primary-button auth-submit" disabled={hub.busy}>
          {hub.busy ? (
            <CircleNotch className="spinning" size={19} />
          ) : (
            <SquaresFour size={19} />
          )}
          Criar meu espaço
          <ArrowRight size={18} />
        </button>
      </form>
      <div className="onboarding-invite">
        <strong>Seu time já usa o Hub?</strong>
        <p>
          Peça ao administrador para adicionar este identificador. Atualize a
          página depois de receber acesso.
        </p>
        <button
          className="copy-id"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(hub.userId);
              hub.notify("Identificador copiado.");
            } catch {
              hub.notify("Selecione e copie seu identificador abaixo.", true);
            }
          }}
        >
          <code>{hub.userId}</code>
          <Copy size={15} />
        </button>
        <button className="text-button" onClick={() => void hub.refreshAll()}>
          Conferir meu acesso <ArrowRight size={14} />
        </button>
      </div>
      <div className="auth-switch">
        <button onClick={signOut}>
          <SignOut size={15} />
          Sair desta conta
        </button>
      </div>
    </AuthShell>
  );
}
