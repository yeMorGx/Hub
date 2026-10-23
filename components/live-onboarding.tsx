"use client";
import { ZuluForm } from "./dashboard-ui";
import { ZuluLabel, ZuluSelect, ZuluInput, ZuluButton } from "./dashboard-ui";
import { useState, type FormEvent } from "react";
import {
  SquaresFour,
  ArrowRight,
  SignOut,
  CircleNotch,
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
    }, "Seu espaço está pronto. Bem-vindo ao ZULU!");
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
          workspace e seu primeiro time, ou abra o link de convite enviado pelo
          administrador para participar de um time existente.
        </p>
      </div>
      {error && (
        <div role="alert" className="form-alert">
          {error}
        </div>
      )}
      <ZuluForm className="auth-form" onSubmit={submit}>
        {admins.length > 0 && (
          <ZuluLabel>
            Workspace
            <ZuluSelect
              value={workspaceId}
              onValueChange={(e) => setWorkspaceId(e)}
              disabled={hub.busy || !!createdWorkspace}
            >
              <option value="">Criar novo workspace</option>
              {admins.map((w) => (
                <option value={w.id} key={w.id}>
                  {w.name}
                </option>
              ))}
            </ZuluSelect>
          </ZuluLabel>
        )}
        {!workspaceId && !createdWorkspace && (
          <ZuluLabel>
            Nome do workspace
            <ZuluInput
              name="workspace"
              required
              maxLength={120}
              placeholder="Nome da sua organização"
            />
          </ZuluLabel>
        )}
        {createdWorkspace && (
          <div className="form-success">
            <CheckCircle size={18} />
            Workspace criado. Agora conclua seu time.
          </div>
        )}
        <ZuluLabel>
          Nome do time
          <ZuluInput
            name="team"
            required
            maxLength={120}
            placeholder="Ex.: Produto"
          />
        </ZuluLabel>
        <p className="demo-note">
          O time terá um canal público #geral para começar as conversas.
        </p>
        <ZuluButton className="primary-button auth-submit" disabled={hub.busy}>
          {hub.busy ? (
            <CircleNotch className="spinning" size={19} />
          ) : (
            <SquaresFour size={19} />
          )}
          Criar meu espaço
          <ArrowRight size={18} />
        </ZuluButton>
      </ZuluForm>
      <div className="onboarding-invite">
        <strong>Seu time já usa o ZULU?</strong>
        <p>
          Peça um link de convite ao administrador e aceite com o e-mail
          convidado. Depois de entrar no time, seu acesso aparece aqui.
        </p>
        <ZuluButton className="text-button" onClick={() => void hub.refreshAll()}>
          Conferir meu acesso <ArrowRight size={14} />
        </ZuluButton>
      </div>
      <div className="auth-switch">
        <ZuluButton onClick={signOut}>
          <SignOut size={15} />
          Sair desta conta
        </ZuluButton>
      </div>
    </AuthShell>
  );
}
