"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowClockwise, Copy, UserPlus } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { TeamAccessData, TeamRole } from "@/lib/invitations/types";
import { errorMessage } from "@/lib/supabase/errors";
export function TeamAccess({
  hub,
  onClose,
}: {
  hub: HubController;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"invite" | "members" | "invitations">(
      "invite",
    ),
    [data, setData] = useState<TeamAccessData>({
      invitations: [],
      members: [],
    }),
    [memberId, setMemberId] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [created, setCreated] = useState<{
      id: string;
      email: string;
      url: string;
    } | null>(null);
  async function load() {
    const result = await hub.rpc("list_team_access", { p_team_id: hub.teamId });
    setData(result as unknown as TeamAccessData);
  }
  useEffect(() => {
    setLoading(true);
    setError("");
    setCreated(null);
    setMemberId("");
    void load()
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [hub.teamId]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function invite(email: string, role: TeamRole) {
    const response = await fetch("/api/team-invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: hub.teamId, email, role }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setCreated({
      id: result.invitation.id,
      email: result.invitation.email,
      url: result.url,
    });
    setNotice("Convite criado. Copie o link e envie para esta pessoa.");
    await load();
  }
  const selected =
    data.members.find((m) => m.id === memberId) || data.members[0];
  async function saveMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fields = new FormData(e.currentTarget);
    await run(async () => {
      const role = String(fields.get("workspaceRole")) as "admin" | "member";
      await hub.rpc("manage_team_access", {
        p_team_id: hub.teamId,
        p_user_id: selected.id,
        p_workspace_role: role,
        p_team_role: String(fields.get("teamRole")) as TeamRole,
        p_is_active: fields.get("active") === "true",
      });
      if (selected.id === hub.userId && role !== "admin") {
        onClose();
        await hub.refreshAll();
        return;
      }
      await load();
      await hub.refreshAll();
      setNotice("Acesso atualizado.");
    });
  }
  return (
    <div className="team-access">
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Acesso ao time"
      >
        {(
          [
            ["invite", "Convidar"],
            ["members", "Membros"],
            ["invitations", "Convites"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            className={tab === id ? "active" : ""}
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando acesso do time…</p>
      ) : (
        <>
          {tab === "invite" && (
            <>
              <p className="demo-note">
                Convide alguém para {hub.currentTeam?.name}. O link vale por
                sete dias e só pode ser aceito pela conta com o e-mail
                informado.
              </p>
              <form
                className="dialog-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fields = new FormData(e.currentTarget);
                  void run(() =>
                    invite(
                      String(fields.get("email")).trim(),
                      String(fields.get("role")) as TeamRole,
                    ),
                  );
                }}
              >
                <label>
                  E-mail da pessoa
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    placeholder="pessoa@empresa.com"
                  />
                </label>
                <label>
                  Papel no time
                  <select name="role" defaultValue="member">
                    <option value="member">Membro</option>
                    <option value="leader">Líder</option>
                  </select>
                </label>
                <button className="primary-button" disabled={busy}>
                  <UserPlus size={16} />
                  {busy ? "Criando…" : "Criar convite"}
                </button>
              </form>
            </>
          )}
          {created && tab !== "members" && (
            <div className="invitation-share">
              <strong>Convite para {created.email}</strong>
              <label>
                Link do convite
                <input
                  readOnly
                  value={created.url}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <button
                className="outline-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(created.url);
                    setNotice("Link copiado.");
                  } catch {
                    setNotice("Selecione e copie o link no campo acima.");
                  }
                }}
              >
                <Copy size={16} />
                Copiar link
              </button>
              <small>
                Compartilhe este link com a pessoa convidada. O ZULU não envia
                e-mails automaticamente nesta etapa.
              </small>
            </div>
          )}
          {tab === "members" && selected && (
            <form
              key={
                selected.id +
                selected.workspace_role +
                selected.team_role +
                selected.team_active
              }
              className="dialog-form"
              onSubmit={(e) => void saveMember(e)}
            >
              <label>
                Pessoa
                <select
                  value={selected.id}
                  onChange={(e) => setMemberId(e.target.value)}
                >
                  {data.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                      {m.id === hub.userId ? " (você)" : ""}
                      {!m.team_active || !m.workspace_active
                        ? " · suspenso"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {!selected.workspace_active ? (
                <>
                  <p className="demo-note">
                    Esta pessoa está suspensa na organização. Reative esse
                    acesso para editar sua participação no time.
                  </p>
                  <button
                    type="button"
                    className="outline-button"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await hub.rpc("set_workspace_member", {
                          p_workspace_id: hub.workspace!.id,
                          p_user_id: selected.id,
                          p_role: selected.workspace_role,
                          p_is_active: true,
                        });
                        await load();
                        await hub.refreshAll();
                        setNotice("Acesso à organização reativado.");
                      })
                    }
                  >
                    Reativar na organização
                  </button>
                </>
              ) : (
                <>
                  <label>
                    Papel na organização
                    <select
                      name="workspaceRole"
                      defaultValue={selected.workspace_role}
                    >
                      <option value="member">Membro</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>
                  <p className="demo-note">
                    Administradores gerenciam os times e acessos de toda a
                    organização.
                  </p>
                  <label>
                    Papel neste time
                    <select name="teamRole" defaultValue={selected.team_role}>
                      <option value="member">Membro</option>
                      <option value="leader">Líder</option>
                    </select>
                  </label>
                  <label>
                    Acesso ao time
                    <select
                      name="active"
                      defaultValue={String(selected.team_active)}
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Suspenso</option>
                    </select>
                  </label>
                  <p className="demo-note">
                    Suspender encerra o timer e a participação neste time.
                    Administradores mantêm as permissões de gestão da
                    organização.
                  </p>
                  <button className="primary-button" disabled={busy}>
                    {busy ? "Salvando…" : "Salvar acesso"}
                  </button>
                </>
              )}
            </form>
          )}
          {tab === "invitations" && (
            <>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void run(load)}
              >
                <ArrowClockwise size={15} />
                Atualizar convites
              </button>
              {data.invitations.length ? (
                <div className="invitation-list">
                  {data.invitations.map((i) => (
                    <article key={i.id}>
                      <div>
                        <strong>{i.email}</strong>
                        <small>
                          {i.role === "leader" ? "Líder" : "Membro"} ·{" "}
                          {
                            {
                              pending: "Aguardando aceite",
                              accepted: "Aceito",
                              revoked: "Revogado",
                              expired: "Expirado",
                            }[i.status]
                          }
                        </small>
                        <small>
                          Válido até{" "}
                          {new Date(i.expires_at).toLocaleString("pt-BR")}
                        </small>
                      </div>
                      {i.status !== "accepted" && (
                        <div className="invitation-row-actions">
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              void run(() => invite(i.email, i.role))
                            }
                          >
                            Gerar novo link
                          </button>
                          {i.status === "pending" && (
                            <button
                              className="text-button"
                              disabled={busy}
                              onClick={() =>
                                void run(async () => {
                                  await hub.rpc("revoke_team_invitation", {
                                    p_invitation_id: i.id,
                                  });
                                  if (created?.id === i.id) setCreated(null);
                                  await load();
                                  setNotice("Convite revogado.");
                                })
                              }
                            >
                              Revogar
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="demo-note">
                  Você ainda não criou convites para este time.
                </p>
              )}
              <p className="demo-note">
                Gerar um novo link invalida o anterior. Aguarde um minuto entre
                tentativas para o mesmo e-mail.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
