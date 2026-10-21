import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#2449e8",
          color: "white",
          padding: 70,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", fontSize: 45, fontWeight: 700 }}>
          ZULU
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 91,
            lineHeight: 1.05,
            letterSpacing: -4,
            fontWeight: 700,
          }}
        >
          <span>Seu time. Um lugar.</span>
          <span style={{ color: "#d5fa71" }}>Mais fluxo.</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#e5eaff",
          }}
        >
          <span>Conversas. Tarefas. Agenda. Horas.</span>
          <span
            style={{
              background: "#d5fa71",
              color: "#172238",
              padding: "12px 24px",
              borderRadius: 7,
            }}
          >
            Conheça o ZULU
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
