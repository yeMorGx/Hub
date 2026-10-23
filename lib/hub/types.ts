import type { Database } from "@/lib/supabase/database.types";
export type TableName = keyof Database["public"]["Tables"];
export type Row<N extends TableName> = Database["public"]["Tables"][N]["Row"];
export type HomeOfficeEntry =
  Database["public"]["Functions"]["get_home_office_calendar"]["Returns"][number];
export type WorkBalanceDay =
  Database["public"]["Functions"]["get_work_hour_balance"]["Returns"][number];
export type Profile = Row<"profiles">;
export type Person = Profile & {
  role: "leader" | "member";
  body: string;
  timer_running: boolean;
};
export type Bootstrap = {
  profile: Profile;
  workspaces: Row<"workspaces">[];
  teams: Row<"teams">[];
  workspaceMemberships: Row<"workspace_members">[];
  teamMemberships: Row<"team_members">[];
};
export type InboxPreview = { channelId: string; personId: string; body: string; unread: number; createdAt: string };
export type TeamSnapshot = {
  teamId: string;
  people: Person[];
  projects: Row<"projects">[];
  tasks: Row<"tasks">[];
  channels: Row<"channels">[];
  channelMemberships: Row<"channel_members">[];
  entries: Row<"time_entries">[];
  events: Row<"events">[];
  attendees: Row<"event_attendees">[];
  homeOffice: HomeOfficeEntry[];
  upcomingHomeOffice: HomeOfficeEntry[];
  homeOfficeSummaryError: boolean;
  workSchedule: Row<"work_schedules"> | null;
  workBalance: WorkBalanceDay[];
  workBalanceLoadedAt: number;
  pausedTimer: Row<"paused_timers"> | null;
  unread: Record<string, number>;
  inbox: InboxPreview[];
  inboxError: boolean;
};
export const EMPTY_TEAM: TeamSnapshot = {
  teamId: "",
  people: [],
  projects: [],
  tasks: [],
  channels: [],
  channelMemberships: [],
  entries: [],
  events: [],
  attendees: [],
  homeOffice: [],
  upcomingHomeOffice: [],
  homeOfficeSummaryError: false,
  workSchedule: null,
  workBalance: [],
  workBalanceLoadedAt: 0,
  pausedTimer: null,
  unread: {},
  inbox: [],
  inboxError: false,
};
export type LivePage =
  | "overview"
  | "calendar"
  | "chat"
  | "hours"
  | "people"
  | "board"
  | "collaboration"
  | "more"
  | "management"
  | "integrations"
  | "calls"
  | "reports" | "notes" | "goals" | "clients" | "shifts" | "absences" | "dates" | "meetings" | "standups" | "notifications" | "settings";
