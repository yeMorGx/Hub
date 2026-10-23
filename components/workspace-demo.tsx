"use client";
import { NotificationBell } from "./notification-bell";
import { WorkspaceChatPreview } from "./workspace-chat-preview";
import { OrganizationPreview } from "./organization-preview";
import { WorkspaceDrawer } from "./workspace-drawer";
import { useEffect, useMemo, useState } from "react";
import { Bell, MagnifyingGlass, SquaresFour } from "@phosphor-icons/react";
import { createDemoBackend } from "@/lib/hub/demo-backend";
import { pageTitles, workspaceArea, workspaceAreas } from "@/lib/hub/navigation";
import { dayKey, dateAt, mondayOf } from "@/lib/hub/dates";
import type { LivePage } from "@/lib/hub/types";
import type { HubController } from "@/lib/hub/use-hub";
import { DashboardLoading, DashboardUIProvider, DashboardWorkspacePicker, ZuluButton } from "./dashboard-ui";
import { DashboardNavIcon } from "./dashboard-nav-icon";
import { WorkspaceAreaTabs } from "./workspace-area-tabs";
import { BrandMark } from "./brand";
import { HoursReport } from "./hours-report";
import { WorkspaceSettings } from "./workspace-settings";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import { LiveManagement } from "./live-management";
import { LiveCollaboration } from "./live-collaboration";
import { LiveCalendar } from "./live-calendar";
import { LiveCalls } from "./live-calls";
import { BoardDemo } from "./board-demo";
import { PersonAvatar, HubDialog } from "./hub-ui";
export function WorkspaceDemo() {
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<LivePage>("reports"), [role, setRole] = useState("admin"), [menu, setMenu] = useState(false), [dialog, setDialog] = useState("");
  const [date, setDate] = useState(new Date()), [view, setView] = useState<"month" | "week" | "day">("week");
  useEffect(() => {
    const query = new URLSearchParams(location.search), requested = query.get("page");
    if (requested && pageTitles[requested as LivePage]) setPage(requested as LivePage);
    setRole(query.get("role") || "admin");
    setReady(true);
  }, []);
  const hub = useMemo(() => {
    const { hub } = createDemoBackend();
    hub.isAdmin = role === "admin" || role === "owner"; hub.canManage = role !== "member";
    if (hub.workspace) hub.workspace.owner_id = role === "owner" ? hub.userId : "demo-other-owner";
    const original = hub.client.rpc.bind(hub.client);
    hub.client = { ...hub.client, functions: { invoke: async () => ({ data: { ok: false, error: "Demonstração: nenhum dado foi apagado." }, error: null }) }, rpc: ((name: string, args: Record<string, string> = {}) => {
      if (name === "organization_deletion_status") return Promise.resolve({ data: false, error: null });
      if (name === "report_time_entries") {
        const users = hub.isAdmin ? hub.snapshot.people : hub.snapshot.people.filter(p => p.id === hub.userId);
        const rows = users.filter(p => !args.p_user_id || p.id === args.p_user_id).map((person, index) => ({ entry_id: `demo-entry-${index}`, user_id: person.id, display_name: person.display_name, project_id: hub.snapshot.projects[0].id, project_name: "Lançamento ZULU", client_id: "demo-client", client_name: "Forma", description: ["Planejamento do produto e revisão das entregas", "Desenvolvimento da interface", "Documentação e pesquisa de referências"][index], started_at: new Date(`${dayKey(new Date())}T09:00:00`).toISOString(), ended_at: new Date(`${dayKey(new Date())}T${12 + index}:00:00`).toISOString(), duration_seconds: (3 + index) * 3600 }));
        return Promise.resolve({ data: rows, error: null });
      }
      if (name === "report_work_balances") {
        const rows = hub.snapshot.people.filter(person => (hub.isAdmin || person.id === hub.userId) && (!args.p_user_id || person.id === args.p_user_id)).map((person, index) => ({ user_id: person.id, display_name: person.display_name, work_date: dayKey(new Date()), expected_minutes: 480, actual_seconds: (3 + index) * 3600, configured: true }));
        return { range: async (start: number, end: number) => ({ data: rows.slice(start, end + 1), error: null }) };
      }
      return original(name as never, args as never);
    }) as unknown as HubController["client"]["rpc"] } as unknown as HubController["client"];
    return hub;
  }, [role]);
  const area = workspaceArea(page);
  const go = (next: LivePage) => { setMenu(false); if (next === "overview") location.href = "/demo/dashboard"; else setPage(next); };
  const management = ["goals", "clients", "shifts", "absences", "dates"].includes(page);
  const collaboration = ["notes", "standups", "meetings", "notifications"].includes(page);
  if (!ready) return <DashboardLoading />;
  return <DashboardUIProvider enabled><div className="app-shell live-app workspace-inset" data-menu-open={menu}>
    
    <aside className="rail" aria-label="Navegação principal"><ZuluButton className="brand" aria-label="ZULU — início" onClick={() => go("overview")}><BrandMark size={44} /></ZuluButton><nav>{workspaceAreas.filter(a => a.id !== "settings").map(a => <ZuluButton key={a.id} className={`rail-button ${area.id === a.id ? "active" : ""}`} aria-label={a.label} onClick={() => go(a.tabs[0][0])}><DashboardNavIcon name={a.icon} /></ZuluButton>)}</nav><div className="rail-bottom"><ZuluButton className="rail-button" aria-label="Configurações" onClick={() => go("settings")}><DashboardNavIcon name="settings" /></ZuluButton></div></aside>
<WorkspaceDrawer open={menu} onOpenChange={setMenu} onPage={go} />    <div className="app-content"><header className="topbar"><ZuluButton className="mobile-navigation-toggle" aria-label="Abrir navegação" aria-expanded={menu} onClick={() => setMenu(!menu)}><SquaresFour size={21} /></ZuluButton><DashboardWorkspacePicker workspace="Forma" teamId="demo" teams={[{ id: "demo", label: "Estúdio", organization: "Forma" }]} role={hub.isAdmin ? "Administrador" : role === "leader" ? "Líder" : "Membro"} canManage={hub.isAdmin} onTeam={() => {}} onNewTeam={() => setDialog("Criar time")} onNewOrganization={() => setDialog("new-organization")} /><div className="topbar-right"><ZuluButton className="icon-button" aria-label="Buscar no ZULU" onClick={() => setDialog("Busca demonstrativa")}><MagnifyingGlass size={20} /></ZuluButton><NotificationBell hub={hub} onOpen={() => go("notifications")} onOpenChannel={() => go("chat")} /><ZuluButton className="top-avatar" aria-label="Meu perfil" onClick={() => setDialog("Perfil demonstrativo")}><PersonAvatar name="Marina Costa" id="demo" /></ZuluButton></div></header>
      <main className="main-content" id="main-content"><WorkspaceAreaTabs page={page} onPage={go} /><div className="page-heading"><div><h1>{area.label}</h1><p>Demonstração · dados fictícios, sem acesso ao seu time.</p></div></div>
        {(page === "organization" || page === "library") && <OrganizationPreview hub={hub} library={page === "library"} />}
        {page === "reports" && <HoursReport key={role} hub={hub} />}
        {page === "settings" && <WorkspaceSettings hub={hub} onProfile={() => setDialog("Perfil demonstrativo")} onMembers={() => go("people")} onIntegrations={() => setDialog("Integrações demonstrativas")} onSignOut={() => setDialog("Nenhuma sessão real nesta demonstração")} />}
        {management && <LiveManagement key={page} hub={hub} initialTab={page as "goals"} embedded />}
        {collaboration && <LiveCollaboration key={page} hub={hub} initialTab={page as "notes"} embedded onOpenChannel={() => go("chat")} />}
        {page === "calendar" && <LiveCalendar hub={hub} date={date} onDate={setDate} monday={mondayOf(date)} today={new Date()} day={(date.getDay() + 6) % 7} view={view} onView={setView} onDay={day => setDate(dateAt(mondayOf(date), day))} onMove={direction => setDate(dateAt(date, direction * 7))} onToday={() => setDate(new Date())} onNew={() => setDialog("Novo encontro demonstrativo")} onSelect={event => setDialog(event.title)} onHomeOffice={() => setDialog("Escala de home office")} full />}
        {page === "board" && <BoardDemo embedded />}
        {page === "people" && <section className="people-grid">{hub.snapshot.people.map(person => <div className="panel" key={person.id}><PersonAvatar name={person.display_name} id={person.id} /><h2>{person.display_name}</h2><p>{person.role === "leader" ? "Líder" : "Membro"}</p></div>)}</section>}
        {page === "calls" && <LiveCalls hub={hub} />}
        {page === "chat" && <WorkspaceChatPreview hub={hub} />}
        {page === "hours" && <a className="primary-button" href="/demo/dashboard">Experimentar o timer de demonstração</a>}
      </main>
    </div>{dialog === "new-organization" && <CreateOrganizationDialog busy={false} onClose={() => setDialog("")} onSubmit={event => { event.preventDefault(); setDialog("Organização demonstrativa — nenhum dado foi salvo"); }} />}{dialog && dialog !== "new-organization" && <HubDialog title={dialog} onClose={() => setDialog("")}><p>Esta é uma demonstração pública com dados fictícios.</p></HubDialog>}
  </div></DashboardUIProvider>;
}
