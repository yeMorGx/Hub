"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Home03 } from "./animate-ui/icons/hugeicons/home-03";
import { Calendar } from "./animate-ui/icons/hugeicons/calendar";
import { Kanban } from "./animate-ui/icons/hugeicons/kanban";
import { MessageCircle } from "./animate-ui/icons/hugeicons/message-circle";
import { Timer } from "./animate-ui/icons/hugeicons/timer";
import { UsersRound } from "./animate-ui/icons/hugeicons/users-round";
import { FolderOpen } from "./animate-ui/icons/hugeicons/folder-open";
import { ChartColumn } from "./animate-ui/icons/hugeicons/chart-column";
import { Headphones } from "./animate-ui/icons/hugeicons/headphones";
import { ShieldCheck } from "./animate-ui/icons/hugeicons/shield-check";
import { MoreHorizontal } from "./animate-ui/icons/hugeicons/more-horizontal";
import { Settings02 } from "./animate-ui/icons/hugeicons/settings-02";

const icons = {
  overview: Home03,
  calendar: Calendar,
  board: Kanban,
  chat: MessageCircle,
  hours: Timer,
  people: UsersRound,
  collaboration: FolderOpen,
  management: ChartColumn,
  calls: Headphones,
  integrations: ShieldCheck,
  more: MoreHorizontal,
  settings: Settings02,
};

/** Official Animate UI Hugeicons; the entire navigation target triggers motion. */
export function DashboardNavIcon({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const target = ref.current?.closest("button, a");
    if (!target) return;
    const start = () => setActive(true);
    const stop = () => setActive(false);
    target.addEventListener("pointerenter", start);
    target.addEventListener("pointerleave", stop);
    target.addEventListener("focusin", start);
    target.addEventListener("focusout", stop);
    return () => {
      target.removeEventListener("pointerenter", start);
      target.removeEventListener("pointerleave", stop);
      target.removeEventListener("focusin", start);
      target.removeEventListener("focusout", stop);
    };
  }, []);
  const Icon = icons[name as keyof typeof icons] ?? MoreHorizontal;
  return (
    <span ref={ref} className="today-nav-icon" aria-hidden="true">
      <Icon size={21} animate={active && !reduce} />
    </span>
  );
}
