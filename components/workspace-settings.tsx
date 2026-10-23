"use client";
import { useEffect, useState } from "react";
import { Button, Tabs, Label, Select, ListBox, Checkbox } from "@heroui/react";
import { HubDialog } from "./hub-ui";
import type { Authority } from "@/lib/organization/model";
import type { OrgCommand } from "./organization-admin";
import { UserCircle, Palette, Desktop, Buildings, ArrowUpRight } from "@phosphor-icons/react";
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
  const canManageOrganization=hub.isAdmin||Boolean(organization?.authority?.team_admin||organization?.authority?.can_approve);
  const [theme, setTheme] = useState("light"), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
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
      </Tabs.Panel>}
    </Tabs>
    {leaveOpen&&organization&&<HubDialog title="Sair da organização" onClose={()=>{if(!busy)setLeaveOpen(false);}}><div className="org-confirm"><p>Você perderá o acesso aos times desta organização. Seus documentos permanecerão com sua autoria e passarão à responsabilidade da administração.</p><Button variant="danger" isDisabled={busy} onPress={async()=>{setBusy(true);try{await organization.command('leave');setLeaveOpen(false);await hub.refreshAll();}catch{setMessage('Não foi possível sair. Confira sua conexão e tente novamente.');}finally{setBusy(false);}}}>Confirmar saída</Button></div></HubDialog>}
    {message && <p className="inline-notice" role="status">{message}</p>}
  </section>;
}

export function WorkspaceTheme() {
  useEffect(() => {
    try { document.documentElement.dataset.zuluTheme = localStorage.getItem("zulu:theme") || "light"; } catch {}
  }, []);
  return null;
}
