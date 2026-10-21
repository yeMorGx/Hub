import { readSignedDesktopRelease } from "@/lib/desktop/updates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch("https://api.github.com/repos/yeMorGx/Hub/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return new Response(null, { status: 204 });
    if (!response.ok) throw new Error("Release unavailable");
    const release = readSignedDesktopRelease(await response.json());
    // Old, unsigned releases are never offered to the native installer.
    if (!release) return new Response(null, { status: 204 });
    const signed = await fetch(release.signatureUrl, {
      next: { revalidate: 300 }, signal: AbortSignal.timeout(8000),
    });
    if (!signed.ok) throw new Error("Signature unavailable");
    // Signatures are small text files; bound the body even if the asset changed.
    const reader = signed.body?.getReader();
    if (!reader) throw new Error("Empty signature");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 8192) throw new Error("Invalid signature size");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const signature = Buffer.concat(chunks).toString("utf8").trim();
    if (!/^[A-Za-z0-9+/=]+$/.test(signature)) throw new Error("Invalid signature");
    return Response.json({
      version: release.version,
      notes: `ZULU ${release.version}`,
      pub_date: release.publishedAt,
      platforms: { "windows-x86_64": { signature, url: release.url } },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível verificar atualizações." }, { status: 503 });
  }
}
