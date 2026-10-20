export type Page = "overview" | "calendar" | "chat" | "hours" | "people";
export type CalendarEvent = {
  id: string;
  title: string;
  project: string;
  day: number;
  start: number;
  duration: number;
  tone: string;
  people: number[];
  description: string;
  rsvp?: boolean;
};
export type TimeEntry = {
  id: string;
  description: string;
  project: string;
  seconds: number;
  date: string;
};
export type ChatMessage = {
  id: string;
  author: number;
  text: string;
  time: string;
};
export type Timer = {
  startedAt: number;
  description: string;
  project: string;
} | null;
export const projects = [
  "Website institucional",
  "Aplicativo mobile",
  "Design system",
  "Planejamento",
];
export const people = [
  {
    name: "Rafael Costa",
    initials: "RC",
    role: "Product designer",
    status: "online",
    work: "Design system · Componentes",
    color: "sand",
  },
  {
    name: "Marina Alves",
    initials: "MA",
    role: "Product manager",
    status: "meeting",
    work: "Reunião de planejamento",
    color: "rose",
  },
  {
    name: "Lucas Santos",
    initials: "LS",
    role: "Frontend developer",
    status: "online",
    work: "Website · Desenvolvimento",
    color: "blue",
  },
  {
    name: "Julia Martins",
    initials: "JM",
    role: "UX designer",
    status: "online",
    work: "Pesquisa · Jornada do usuário",
    color: "green",
  },
  {
    name: "Pedro Lima",
    initials: "PL",
    role: "Backend developer",
    status: "away",
    work: "Volto às 14h",
    color: "purple",
  },
  {
    name: "Ana Oliveira",
    initials: "AO",
    role: "Brand designer",
    status: "offline",
    work: "Offline",
    color: "orange",
  },
];
export const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Alinhamento da semana",
    project: "Planejamento",
    day: 0,
    start: 9.5,
    duration: 1,
    tone: "blue",
    people: [0, 1, 2, 3],
    description: "Prioridades da semana e alinhamento das entregas do time.",
  },
  {
    id: "2",
    title: "Exploração visual",
    project: "Website institucional",
    day: 0,
    start: 11,
    duration: 1.5,
    tone: "orange",
    people: [0, 5],
    description: "Explorar a direção visual da nova experiência.",
  },
  {
    id: "3",
    title: "Design review",
    project: "Design system",
    day: 1,
    start: 9,
    duration: 1.5,
    tone: "purple",
    people: [0, 3, 5],
    description: "Revisar os componentes e compartilhar feedback.",
  },
  {
    id: "4",
    title: "Novos componentes",
    project: "Design system",
    day: 1,
    start: 11.5,
    duration: 1.5,
    tone: "green",
    people: [0, 2],
    description: "Alinhar especificações e comportamento dos componentes.",
  },
  {
    id: "5",
    title: "Daily do time",
    project: "Planejamento",
    day: 2,
    start: 9,
    duration: 1,
    tone: "blue",
    people: [0, 1, 2, 3],
    description: "O que estamos fazendo e onde precisamos de ajuda.",
  },
  {
    id: "6",
    title: "Interface do website",
    project: "Website institucional",
    day: 2,
    start: 10.5,
    duration: 2,
    tone: "orange",
    people: [0, 2],
    description: "Sessão de trabalho para evoluir as telas do website.",
  },
  {
    id: "7",
    title: "Pesquisa com usuários",
    project: "Aplicativo mobile",
    day: 3,
    start: 9.5,
    duration: 1.5,
    tone: "purple",
    people: [1, 3],
    description: "Compartilhar aprendizados da rodada de entrevistas.",
  },
  {
    id: "8",
    title: "Handoff com dev",
    project: "Website institucional",
    day: 3,
    start: 12,
    duration: 1,
    tone: "blue",
    people: [0, 2, 4],
    description: "Alinhar os detalhes da entrega e tirar dúvidas técnicas.",
  },
  {
    id: "9",
    title: "Revisão da sprint",
    project: "Planejamento",
    day: 4,
    start: 9,
    duration: 1.5,
    tone: "green",
    people: [0, 1, 2, 3],
    description: "Revisar entregas e fechar os próximos passos.",
  },
  {
    id: "10",
    title: "Próximos passos",
    project: "Aplicativo mobile",
    day: 4,
    start: 11.5,
    duration: 1,
    tone: "purple",
    people: [1, 3],
    description: "Organizar prioridades do próximo ciclo.",
  },
];
export const initialMessages: Record<string, ChatMessage[]> = {
  geral: [
    {
      id: "m1",
      author: 1,
      text: "Bom dia, time! Já atualizei a agenda da semana. Podemos alinhar as prioridades na daily?",
      time: "09:02",
    },
    {
      id: "m2",
      author: 2,
      text: "Bom dia! Por aqui, sigo com os componentes do website. O menu já está pronto para revisão.",
      time: "09:05",
    },
    {
      id: "m3",
      author: 3,
      text: "Os aprendizados da pesquisa também estão organizados. Compartilho com vocês no nosso alinhamento.",
      time: "09:08",
    },
    {
      id: "m4",
      author: 0,
      text: "Combinado! Vou finalizar os ajustes do design system e já entro com vocês.",
      time: "09:12",
    },
  ],
  design: [
    {
      id: "d1",
      author: 3,
      text: "Deixei a revisão de componentes na agenda de terça. Vamos olhar os estados de formulário juntos?",
      time: "10:15",
    },
  ],
  desenvolvimento: [
    {
      id: "dev1",
      author: 2,
      text: "O ambiente de desenvolvimento está pronto para começarmos a integração.",
      time: "08:45",
    },
  ],
  marina: [
    {
      id: "dm1",
      author: 1,
      text: "Oi, Rafael! Consegue reservar um horário para revisarmos o planejamento?",
      time: "09:30",
    },
  ],
};
export function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export function dateAt(monday: Date, day: number) {
  const d = new Date(monday);
  d.setDate(d.getDate() + day);
  return d;
}
export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function hourLabel(n: number) {
  return `${String(Math.floor(n)).padStart(2, "0")}:${String(Math.round((n % 1) * 60)).padStart(2, "0")}`;
}
export function shortDuration(s: number) {
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}
