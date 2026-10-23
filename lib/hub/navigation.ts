import type { LivePage } from "./types";
export const workspaceAreas = [
  { id: "overview", label: "Hoje", icon: "overview", tabs: [["overview", "Hoje"]] },
  { id: "work", label: "Trabalho", icon: "board", tabs: [["board", "Tarefas"], ["hours", "Horas"], ["reports", "Relatórios"], ["notes", "Documentos"], ["goals", "Metas"], ["clients", "Clientes"]] },
  { id: "conversations", label: "Conversas", icon: "chat", tabs: [["chat", "Mensagens"], ["calls", "Chamadas"], ["notifications", "Notificações"]] },
  { id: "agenda", label: "Agenda", icon: "calendar", tabs: [["calendar", "Calendário"], ["shifts", "Plantões"], ["absences", "Ausências"], ["dates", "Datas do time"], ["meetings", "Pautas e atas"]] },
  { id: "team", label: "Equipe", icon: "people", tabs: [["people", "Pessoas"], ["standups", "Check-ins"]] },
  { id: "settings", label: "Configurações", icon: "settings", tabs: [["settings", "Preferências"], ["integrations", "Integrações"]] },
] as const;
export function workspaceArea(page: LivePage) {
  return workspaceAreas.find(area => area.tabs.some(([id]) => id === page)) ?? workspaceAreas[0];
}
export const pageTitles: Partial<Record<LivePage, string>> = Object.fromEntries(workspaceAreas.reduce<[string, string][]>((rows, area) => [...rows, ...area.tabs.map(([id, title]): [string, string] => [id, title])], []));
