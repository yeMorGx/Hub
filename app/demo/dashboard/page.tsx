import type { Metadata } from "next";
import { DashboardDemo } from "@/components/dashboard-demo";

export const metadata: Metadata = {
  title: "Hoje · Demonstração do ZULU",
  robots: { index: false, follow: false },
};

export default function DashboardDemoPage() {
  return <DashboardDemo />;
}
