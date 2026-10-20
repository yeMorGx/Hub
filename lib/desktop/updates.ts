export const DESKTOP_RELEASES = "https://github.com/yeMorGx/Hub/releases";
export function versionParts(version: string): number[] | null {
  if (!/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(version)) return null;
  return version.split(".").map(Number);
}
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = versionParts(candidate), b = versionParts(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
export function readDesktopRelease(value: unknown): { version: string } | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (r.draft !== false || r.prerelease !== false || typeof r.tag_name !== "string") return null;
  const version = r.tag_name.replace(/^desktop-v/, "");
  if (r.tag_name !== `desktop-v${version}` || !versionParts(version) || !Array.isArray(r.assets)) return null;
  const name = `Hub_${version}_x64-setup.exe`;
  const url = `${DESKTOP_RELEASES}/download/desktop-v${version}/${name}`;
  if (!r.assets.some(a => a && a.name === name && a.browser_download_url === url && a.state === "uploaded" && a.size > 0)) return null;
  return { version };
}
