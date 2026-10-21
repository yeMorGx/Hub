import { createElement } from "react";
import { ImageResponse } from "next/og";
import { SquaresFour } from "@phosphor-icons/react/dist/ssr";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: requested } = await params;
  const size = Number(requested);
  if (![180, 192, 512].includes(size))
    return new Response("Icon not found", { status: 404 });
  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          backgroundColor: "#101112",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      createElement(SquaresFour, {
        size: Math.round(size * 0.55),
        weight: "fill",
        color: "#e26540",
      }),
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
