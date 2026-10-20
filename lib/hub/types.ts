import type { Database } from "@/lib/supabase/database.types";
export type TableName = keyof Database["public"]["Tables"];
export type Row<N extends TableName> = Database["public"]["Tables"][N]["Row"];
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
  unread: Record<string, number>;
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
  unread: {},
};
export type LivePage =
  | "overview"
  | "calendar"
  | "chat"
  | "hours"
  | "people"
  | "board";
