import type { LivePage } from "./types";
export const workspaceAreas = [
  { id: "overview", label: "Hoje", icon: "overview", tabs: [["overview", "Hoje"]] },
  { id: "work", label: "Trabalho", icon: "board", tabs: [["board", "Tarefas"], ["hours", "Horas"], ["reports", "Relatórios"], ["library", "Biblioteca"], ["notes", "Notas"], ["goals", "Metas"], ["clients", "Clientes"]] },
  { id: "conversations", label: "Conversas", icon: "chat", tabs: [["chat", "Mensagens"], ["organization-chat", "Contatos"], ["calls", "Chamadas"], ["notifications", "Notificações"]] },
  { id: "agenda", label: "Agenda", icon: "calendar", tabs: [["calendar", "Calendário"], ["shifts", "Plantões"], ["absences", "Ausências"], ["dates", "Datas do time"], ["meetings", "Pautas e atas"]] },
  { id: "team", label: "Equipe", icon: "people", tabs: [["people", "Pessoas"], ["standups", "Check-ins"]] },
  { id: "settings", label: "Configurações", icon: "settings", tabs: [["settings", "Preferências"], ["organization", "Organização"], ["integrations", "Integrações"]] },
] as const;
export function workspaceArea(page: LivePage) {
  return workspaceAreas.find(area => area.tabs.some(([id]) => id === page)) ?? workspaceAreas[0];
}
export const pageTitles: Partial<Record<LivePage, string>> = Object.fromEntries(workspaceAreas.reduce<[string, string][]>((rows, area) => [...rows, ...area.tabs.map(([id, title]): [string, string] => [id, title])], []));

/** Search and navigation share the same page catalog and permission predicate. */
export const workspaceSearchPages = workspaceAreas.flatMap(area =>
  area.tabs.map(([id, label]) => ({ id, label, area: area.label, icon: area.icon })),
);
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
export function searchWorkspacePages(query: string, isAllowed: (page: LivePage) => boolean = () => true) {
  const term = normalizeSearch(query);
  return workspaceSearchPages.filter(page => isAllowed(page.id) && normalizeSearch(`${page.label} ${page.area}`).includes(term));
}
