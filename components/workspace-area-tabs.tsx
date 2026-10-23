"use client";
import { Tabs } from "@heroui/react";
import { workspaceArea } from "@/lib/hub/navigation";
import type { LivePage } from "@/lib/hub/types";
export function WorkspaceAreaTabs({ page, onPage }: { page: LivePage; onPage: (page: LivePage) => void }) {
  const area = workspaceArea(page);
  if (area.tabs.length < 2) return null;
  return <Tabs className="area-tabs" selectedKey={page} onSelectionChange={key => onPage(String(key) as LivePage)}>
    <Tabs.ListContainer><Tabs.List aria-label={area.label}>
      {area.tabs.map(([id, label]) => <Tabs.Tab key={id} id={id}>{label}<Tabs.Indicator /></Tabs.Tab>)}
    </Tabs.List></Tabs.ListContainer>
    {area.tabs.map(([id, label]) => <Tabs.Panel key={id} id={id} className="area-tab-description"><span className="sr-only">{label}</span></Tabs.Panel>)}
  </Tabs>;
}
