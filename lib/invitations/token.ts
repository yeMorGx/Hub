import { createHash, randomBytes } from "node:crypto";
export const INVITATION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-hub-team-invite"
    : "hub-team-invite";
export const validInvitationToken = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export function invitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}
