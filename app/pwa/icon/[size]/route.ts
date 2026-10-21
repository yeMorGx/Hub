import { readFile } from "node:fs/promises";
import path from "node:path";

// Literal paths let the deployment trace all three owner-approved icon assets.
const icons: Record<string, () => Promise<Buffer>> = {
  "180": () => readFile(path.join(process.cwd(), "public/brand/zulu-180.png")),
  "192": () => readFile(path.join(process.cwd(), "public/brand/zulu-192.png")),
  "512": () => readFile(path.join(process.cwd(), "public/brand/zulu-512.png")),
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!Object.hasOwn(icons, size)) return new Response("Icon not found", { status: 404 });
  return new Response(new Uint8Array(await icons[size]()), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
