import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./globals.css";
import "./dashboard.css";
import "./dashboard-bento.css";
import "./desktop.css";
import "./zulu-workspace.css";
import "./calendar-interactions.css";
import "./workspace-inset.css";
import "./organization-admin.css";
import "./motion.css";
import "./collaboration-design.css";
import "./calls-design.css";
import { WorkspaceTheme } from "@/components/workspace-settings";
import { ServiceWorkerRegistration } from "@/components/pwa";
import { DesktopUpdate } from "@/components/desktop-update";
import { DesktopTitlebar } from "@/components/desktop-titlebar";
import { MotionProvider } from "@/components/motion/motion-provider";
export const metadata: Metadata = {
  title: "ZULU — Seu time, conectado",
  description:
    "Conversas, agenda e horas. Um espaço para o trabalho acontecer.",
  applicationName: "ZULU",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pwa/icon/192?v=zulu-1", apple: "/pwa/icon/180?v=zulu-1" },
  appleWebApp: {
    capable: true,
    title: "ZULU",
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
        <WorkspaceTheme />
        <DesktopTitlebar />
        <MotionProvider>{children}</MotionProvider>
        <ServiceWorkerRegistration />
        <DesktopUpdate />
      </body>
    </html>
  );
}
