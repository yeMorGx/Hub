import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing";
import "../marketing.css";
export const metadata: Metadata = {
  icons: { icon: "/marketing/icon.svg" },
  title: "Hub — Seu time. Um lugar. Mais fluxo.",
  description:
    "Conversas, tarefas, agenda e horas no mesmo espaço. Conheça o Hub e baixe o aplicativo para Windows ou use no navegador.",
  alternates: { canonical: "https://hub-one-azure.vercel.app/site" },
  openGraph: {
    title: "Hub — Seu time. Um lugar. Mais fluxo.",
    description:
      "O trabalho se encontra no Hub. Conheça seu próximo espaço de trabalho em equipe.",
    url: "https://hub-one-azure.vercel.app/site",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "https://hub-one-azure.vercel.app/marketing/og.png",
        width: 1200,
        height: 630,
        alt: "Hub — Seu time. Um lugar. Mais fluxo.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};
export default function Page() {
  return <LandingPage />;
}
