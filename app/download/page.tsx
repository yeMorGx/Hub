import type { Metadata } from "next";
import { DownloadPage } from "@/components/marketing";
import "../marketing.css";
export const metadata: Metadata = {
  icons: { icon: "/marketing/icon.svg" },
  title: "Baixar ZULU — Windows e versão web",
  description:
    "Baixe o ZULU para Windows x64. Confira versão, requisitos, notas da versão e integridade do instalador. No Mac, Linux e celular, use a versão web.",
  alternates: { canonical: "https://hub-one-azure.vercel.app/download" },
  openGraph: {
    title: "ZULU — O seu time vai junto.",
    description:
      "Encontre sua versão do ZULU. Download Windows x64 e acesso pelo navegador.",
    url: "https://hub-one-azure.vercel.app/download",
    images: [
      {
        url: "https://hub-one-azure.vercel.app/marketing/og.png",
        width: 1200,
        height: 630,
      },
    ],
  },
};
export default function Page() {
  return <DownloadPage />;
}
