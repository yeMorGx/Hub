export type TeamRole = "member" | "leader";
export type InvitationPreview = {
  team_name: string;
  workspace_name: string;
  role: TeamRole;
  expires_at: string;
};
export type TeamInvitation = {
  id: string;
  email: string;
  role: TeamRole;
  created_at: string;
  expires_at: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};
export type AccessMember = {
  id: string;
  display_name: string;
  workspace_role: "admin" | "member";
  team_role: TeamRole;
  workspace_active: boolean;
  team_active: boolean;
};
export type TeamAccessData = {
  invitations: TeamInvitation[];
  members: AccessMember[];
};
