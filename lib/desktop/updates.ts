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

/** Only a published Windows installer accompanied by its detached signature. */
export function readSignedDesktopRelease(value: unknown): { version: string; url: string; signatureUrl: string; publishedAt: string } | null {
  const release = readDesktopRelease(value);
  if (!release) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.published_at !== "string" || !Number.isFinite(Date.parse(r.published_at))) return null;
  const url = `${DESKTOP_RELEASES}/download/desktop-v${release.version}/Hub_${release.version}_x64-setup.exe`;
  const signatureUrl = `${url}.sig`;
  const name = `Hub_${release.version}_x64-setup.exe.sig`;
  if (!(r.assets as Record<string, unknown>[]).some(asset => asset?.name === name && asset.browser_download_url === signatureUrl && asset.state === "uploaded" && typeof asset.size === "number" && asset.size > 0 && asset.size <= 8192)) return null;
  return { version: release.version, url, signatureUrl, publishedAt: new Date(r.published_at).toISOString() };
}
