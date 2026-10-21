import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ZULU — Seu time, conectado",
    short_name: "ZULU",
    description:
      "Conversas, agenda e horas. Um espaço para o trabalho acontecer.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101112",
    theme_color: "#101112",
    orientation: "any",
    icons: [
      {
        src: "/pwa/icon/192?v=zulu-1",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon/512?v=zulu-1",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon/512?v=zulu-1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
