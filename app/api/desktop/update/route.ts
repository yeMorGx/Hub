import { readDesktopRelease } from "@/lib/desktop/updates";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await fetch("https://api.github.com/repos/yeMorGx/Hub/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return Response.json({ release: null });
    if (!response.ok) throw new Error("Release unavailable");
    return Response.json({ release: readDesktopRelease(await response.json()) });
  } catch {
    return Response.json({ error: "Não foi possível verificar atualizações." }, { status: 503 });
  }
}
