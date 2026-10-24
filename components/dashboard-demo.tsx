"use client";
import { HubWorkspace } from "./live-hub-app";
import { useDemoWorkspace } from "@/lib/hub/use-demo-workspace";
import { demoUser } from "@/lib/hub/demo-backend";
export function DashboardDemo() { return <HubWorkspace userId={demoUser} useController={useDemoWorkspace} demo />; }
