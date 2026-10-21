export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { buildId: process.env.NEXT_PUBLIC_HUB_BUILD_ID ?? "local" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
