"use client";
import { Modal } from "@heroui/react";
import { useEffect } from "react";
import { workspaceAreas } from "@/lib/hub/navigation";
import type { LivePage } from "@/lib/hub/types";
import { ZuluButton } from "./dashboard-ui";
import { DashboardNavIcon } from "./dashboard-nav-icon";
export function WorkspaceDrawer({ open, onOpenChange, onPage }: { open: boolean; onOpenChange: (open: boolean) => void; onPage: (page: LivePage) => void }) {
  useEffect(() => {
    const media = matchMedia("(min-width: 761px)");
    const resize = () => { if (media.matches) onOpenChange(false); };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [onOpenChange]);
  return <Modal isOpen={open} onOpenChange={onOpenChange}>
    <Modal.Backdrop className="workspace-drawer-backdrop">
      <Modal.Container className="workspace-drawer-container" placement="top" size="xs">
        <Modal.Dialog className="zulu-overlay workspace-drawer" aria-label="Navegação principal">
          <Modal.Heading className="sr-only">Navegação</Modal.Heading><Modal.CloseTrigger aria-label="Fechar navegação" />
          <nav aria-label="Áreas do ZULU">{workspaceAreas.map(area => <ZuluButton key={area.id} className="rail-button" aria-label={area.label} onClick={() => { onOpenChange(false); onPage(area.tabs[0][0]); }}><DashboardNavIcon name={area.icon} /></ZuluButton>)}</nav>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}
