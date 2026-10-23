"use client";
import { useEffect, useState } from "react";
import { Button, Tabs, Label, Select, ListBox, Checkbox, Spinner } from "@heroui/react";
import { ZuluForm, ZuluInput, ZuluLabel } from "./dashboard-ui";
import { clearVault } from "@/public/offline-vault.js";
import { HubDialog } from "./hub-ui";
import type { Authority } from "@/lib/organization/model";
import type { OrgCommand } from "./organization-admin";
import { UserCircle, Palette, Desktop, Buildings, ArrowUpRight, Trash } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { PushSettings } from "./push-settings";
import { OfflineSettings } from "./offline-settings";
import { InstallApp } from "./pwa";
import { desktopRuntime, isDesktopRuntime, type RuntimeState } from "@/lib/desktop/runtime";

export function WorkspaceSettings({ hub, onProfile, onMembers, onIntegrations, onSignOut, organization }: {
  hub: HubController; onProfile: () => void; onMembers: () => void; onIntegrations: () => void; onSignOut: () => void; organization?: { authority: Authority | null; command: OrgCommand };
}) {
  const [narrow, setNarrow] = useState(false);
  const [leaveOpen,setLeaveOpen]=useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false), [confirmation, setConfirmation] = useState(""), [deleteError, setDeleteError] = useState(""), [deletionPending, setDeletionPending] = useState(false);
  const isOwner = hub.workspace?.owner_id === hub.userId || Boolean(organization?.authority?.owner);
  const canManageOrganization=isOwner||hub.isAdmin||Boolean(organization?.authority?.team_admin||organization?.authority?.can_approve);
  const [theme, setTheme] = useState("light"), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  useEffect(() => {
    setDeleteOpen(false); setConfirmation(""); setDeleteError(""); setDeletionPending(false);
    if (!isOwner || !hub.workspace?.id) return;
    let active = true;
    void hub.client.rpc("organization_deletion_status", { p_workspace_id: hub.workspace.id }).then(({ data }) => { if (active) setDeletionPending(data === true); });
    return () => { active = false; };
  }, [hub.client, hub.workspace?.id, isOwner]);
  async function deleteOrganization() {
    if (busy || !isOwner || !hub.workspace || confirmation.trim() !== hub.workspace.name) return;
    const workspaceId = hub.workspace.id;
    setBusy(true); setDeleteError("");
    try {
      let completed = false;
      while (!completed) {
        const { data, error } = await hub.client.functions.invoke("delete-organization", { body: { workspace_id: workspaceId, confirmation_name: confirmation.trim() } });
        if (error || !data?.ok) throw new Error(data?.error || "A exclusão não terminou. Confira sua conexão e tente novamente.");
        setDeletionPending(true);
        completed = data.completed === true;
      }
      await clearVault().catch(() => {});
      setDeleteOpen(false);
      hub.notify("Organização excluída definitivamente.");
      await hub.refreshBootstrap();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Não foi possível concluir a exclusão.");
      const status = await hub.client.rpc("organization_deletion_status", { p_workspace_id: workspaceId });
      if (!status.error) setDeletionPending(status.data === true);
      // Reconcile access if the server finished but its response was lost.
      await clearVault().catch(() => {});
      await hub.refreshBootstrap();
    } finally { setBusy(false); }
  }
  useEffect(() => {
    const media = matchMedia("(max-width: 760px)"); const update = () => setNarrow(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    try { setTheme(localStorage.getItem("zulu:theme") || "light"); } catch {}
    if (isDesktopRuntime()) void desktopRuntime("state").then(setRuntime).catch(() => setMessage("Não foi possível consultar as opções do desktop."));
  }, []);
  async function runtimeAction(action: "set_autostart" | "show_mini" | "hide_mini" | "quit", enabled?: boolean) {
    setBusy(true); setMessage("");
    try { setRuntime(await desktopRuntime(action, enabled)); } catch { setMessage("Não foi possível alterar essa opção. Tente novamente."); } finally { setBusy(false); }
  }
  return <section className="workspace-settings" aria-label="Configurações do ZULU">
    <Tabs orientation={narrow ? "horizontal" : "vertical"} className="settings-tabs" defaultSelectedKey="account">
      <Tabs.ListContainer><Tabs.List aria-label="Seções de configurações">
        <Tabs.Tab id="account"><UserCircle size={20} />Conta<Tabs.Indicator /></Tabs.Tab>
        <Tabs.Tab id="preferences"><Palette size={20} />Preferências<Tabs.Indicator /></Tabs.Tab>
        <Tabs.Tab id="desktop"><Desktop size={20} />Desktop<Tabs.Indicator /></Tabs.Tab>
        {canManageOrganization && <Tabs.Tab id="organization"><Buildings size={20} />Organização<Tabs.Indicator /></Tabs.Tab>}
      </Tabs.List></Tabs.ListContainer>
      <Tabs.Panel id="account" className="settings-panel">
        <h2>Sua conta</h2><p>Seu perfil acompanha você em todos os times.</p>
        <div className="settings-row"><div><strong>Perfil e foto</strong><p>Atualize seu nome, sua imagem e seu foco.</p></div><Button variant="secondary" onPress={onProfile}>Editar perfil</Button></div>
        <div className="settings-row"><div><strong>Senha e segurança</strong><p>Sua conta usa autenticação em duas etapas.</p></div><Button variant="secondary" isDisabled={busy} onPress={async () => {
          setBusy(true); setMessage("");
          try {
            const { data, error } = await hub.client.auth.getUser(); if (error || !data.user?.email) throw Error();
            const result = await hub.client.auth.resetPasswordForEmail(data.user.email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
            if (result.error) throw result.error; setMessage("Enviamos um link para alterar sua senha.");
          } catch { setMessage("Não foi possível enviar o link. Aguarde e tente novamente."); } finally { setBusy(false); }
        }}>Alterar senha</Button></div>
        {organization&&<div className="settings-row"><div><strong>Sair da organização</strong><p>{organization.authority?.owner?"Para sair, transfira a coroa e aguarde o aceite do sucessor.":"Você perderá os acessos aos times. A autoria dos seus documentos será preservada."}</p></div><Button variant="danger-soft" onPress={()=>organization.authority?.owner?onMembers():setLeaveOpen(true)}>{organization.authority?.owner?"Transferir coroa":"Sair da organização"}</Button></div>}
        <div className="settings-row"><div><strong>Encerrar sessão</strong><p>Saia da sua conta neste dispositivo.</p></div><Button variant="danger-soft" onPress={onSignOut}>Sair da conta</Button></div>
      </Tabs.Panel>
      <Tabs.Panel id="preferences" className="settings-panel">
        <h2>Do seu jeito</h2><p>Preferências deste dispositivo.</p>
        <div className="settings-row"><div><strong>Aparência</strong><p>Escolha a iluminação do seu espaço.</p></div>
          <Select aria-label="Tema do aplicativo" value={theme} onChange={key => {
            const value = String(key); setTheme(value); document.documentElement.dataset.zuluTheme = value;
            try { localStorage.setItem("zulu:theme", value); } catch {}
          }}><Label className="sr-only">Tema do aplicativo</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover className="zulu-overlay"><ListBox><ListBox.Item id="light" textValue="Claro"><Label>Claro</Label><ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="dark" textValue="Escuro"><Label>Escuro</Label><ListBox.ItemIndicator /></ListBox.Item></ListBox></Select.Popover></Select>
        </div>
        <PushSettings hub={hub} /><OfflineSettings userId={hub.userId} /><InstallApp />
      </Tabs.Panel>
      <Tabs.Panel id="desktop" className="settings-panel">
        <h2>ZULU no seu PC</h2><p>Seu tempo à mão, mesmo com a janela recolhida.</p>
        {runtime?.supported ? <>
          <div className="settings-row"><div><strong>Abrir ao ligar o PC</strong><p>Inicia discretamente na bandeja.</p></div><Checkbox isSelected={runtime.autostart} isDisabled={busy} onChange={enabled => void runtimeAction("set_autostart", enabled)}><Checkbox.Content><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>Iniciar automaticamente</Checkbox.Content></Checkbox></div>
          <div className="settings-row"><div><strong>Segundo plano</strong><p>{runtime.background ? "Ativo. Fechar a janela mantém o ZULU na bandeja." : "Bandeja indisponível neste dispositivo. Fechar a janela encerra o app."}</p></div></div>
          <div className="settings-row"><div><strong>Mini timer</strong><p>Cápsula flutuante com dois tamanhos e ações rápidas.</p></div><Button variant="secondary" isDisabled={busy} onPress={() => void runtimeAction(runtime.miniVisible ? "hide_mini" : "show_mini")}>{runtime.miniVisible ? "Ocultar" : "Mostrar"}</Button></div>
          <Button variant="danger-soft" isDisabled={busy} onPress={() => void runtimeAction("quit")}>Encerrar ZULU</Button>
        </> : <div className="settings-row"><p>Estas opções ficam disponíveis no aplicativo para Windows.</p><a href="/download">Baixar aplicativo <ArrowUpRight size={16} /></a></div>}
      </Tabs.Panel>
      {canManageOrganization && <Tabs.Panel id="organization" className="settings-panel">
        <h2>{hub.workspace?.name ?? "Sua organização"}</h2><p>Administre as conexões e os acessos do seu time.</p>
        <div className="settings-row"><div><strong>Pessoas e permissões</strong><p>Convites, papéis e acesso ao time.</p></div><Button variant="secondary" onPress={onMembers}>Gerenciar pessoas</Button></div>
        <div className="settings-row"><div><strong>Integrações e auditoria</strong><p>Calendários, automações e histórico de alterações.</p></div><Button variant="secondary" onPress={onIntegrations}>Abrir integrações</Button></div>
        {isOwner && <div className="settings-row organization-delete-row"><div><strong>{deletionPending ? "Exclusão em andamento" : "Excluir organização"}</strong><p>{deletionPending ? "Retome para terminar de apagar os arquivos e dados deste espaço." : "Apaga permanentemente todos os times, conversas, documentos, arquivos e horas desta organização."}</p></div><Button variant="danger-soft" isDisabled={busy} onPress={() => { setConfirmation(""); setDeleteError(""); setDeleteOpen(true); }}><Trash size={17} />{deletionPending ? "Continuar exclusão" : "Excluir organização"}</Button></div>}
      </Tabs.Panel>}
    </Tabs>
    {leaveOpen&&organization&&<HubDialog title="Sair da organização" onClose={()=>{if(!busy)setLeaveOpen(false);}}><div className="org-confirm"><p>Você perderá o acesso aos times desta organização. Seus documentos permanecerão com sua autoria e passarão à responsabilidade da administração.</p><Button variant="danger" isDisabled={busy} onPress={async()=>{setBusy(true);try{await organization.command('leave');setLeaveOpen(false);await hub.refreshAll();}catch{setMessage('Não foi possível sair. Confira sua conexão e tente novamente.');}finally{setBusy(false);}}}>Confirmar saída</Button></div></HubDialog>}
    {deleteOpen && isOwner && hub.workspace && <HubDialog title={deletionPending ? "Concluir exclusão" : "Excluir organização"} onClose={() => { if (!busy) setDeleteOpen(false); }}>
      <ZuluForm className="org-confirm" onSubmit={event => { event.preventDefault(); void deleteOrganization(); }}>
        <p><strong>{hub.workspace.name}</strong> e todos os seus dados armazenados no ZULU serão apagados permanentemente para todos os participantes.</p>
        <p className="org-delete-warning">Esta ação não pode ser desfeita. Sua conta pessoal continua ativa.</p>
        {deletionPending && <p>O processo já começou. Continue para remover os arquivos restantes e concluir a exclusão.</p>}
        <ZuluLabel>Digite o nome da organização<ZuluInput name="confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoFocus autoComplete="off" disabled={busy} required maxLength={120} aria-describedby="organization-delete-help" /></ZuluLabel>
        <small id="organization-delete-help">{hub.workspace.name}</small>
        {deleteError && <p role="alert" className="org-feedback org-error">{deleteError}</p>}
        <div className="organization-delete-actions"><Button type="button" variant="secondary" isDisabled={busy} onPress={() => setDeleteOpen(false)}>Fechar</Button><Button type="submit" variant="danger" isDisabled={busy || confirmation.trim() !== hub.workspace.name}>{busy ? <><Spinner size="sm" />Excluindo…</> : <><Trash size={17} />{deletionPending ? "Continuar exclusão" : "Excluir definitivamente"}</>}</Button></div>
        {busy && <p role="status">Apagando arquivos e dados. Aguarde a confirmação.</p>}
      </ZuluForm>
    </HubDialog>}
    {message && <p className="inline-notice" role="status">{message}</p>}
  </section>;
}

export function WorkspaceTheme() {
  useEffect(() => {
    try { document.documentElement.dataset.zuluTheme = localStorage.getItem("zulu:theme") || "light"; } catch {}
  }, []);
  return null;
}
