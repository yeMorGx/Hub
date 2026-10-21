import { DesktopMiniTimer } from "@/components/desktop-mini-timer";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "ZULU — Mini timer", robots:{index:false,follow:false} };
export default function MiniTimerPage() { return <DesktopMiniTimer/>; }
