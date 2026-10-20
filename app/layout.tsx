import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa";
import { DesktopUpdate } from "@/components/desktop-update";
export const metadata: Metadata = {
  title: "Hub — Seu time, conectado",
  description:
    "Conversas, agenda e horas. Um espaço para o trabalho acontecer.",
  applicationName: "Hub",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pwa/icon/192", apple: "/pwa/icon/180" },
  appleWebApp: {
    capable: true,
    title: "Hub",
    statusBarStyle: "black-translucent",
  },
};
export const viewport: Viewport = {
  themeColor: "#101112",
  colorScheme: "dark",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ServiceWorkerRegistration />
        <DesktopUpdate />
      </body>
    </html>
  );
}
