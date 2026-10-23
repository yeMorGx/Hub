"use client";
import type { FormEvent } from "react";
import { CircleNotch, Plus } from "@phosphor-icons/react";
import { HubDialog } from "./hub-ui";
import { ZuluButton, ZuluForm, ZuluInput, ZuluLabel } from "./dashboard-ui";

export function CreateOrganizationDialog({ busy, onSubmit, onClose }: {
  busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  return <HubDialog title="Nova organização" onClose={() => { if (!busy) onClose(); }}>
    <ZuluForm className="dialog-form organization-create-form" onSubmit={onSubmit}>
      <p className="org-muted">Um espaço independente, com você como dono.</p>
      <ZuluLabel>Nome da organização<ZuluInput name="name" required autoFocus maxLength={120} disabled={busy} placeholder="Nome da empresa ou do grupo" /></ZuluLabel>
      <ZuluLabel>Primeiro time<ZuluInput name="team" required maxLength={120} disabled={busy} defaultValue="Geral" /></ZuluLabel>
      <p className="org-muted">O time começa com o canal #geral.</p>
      <div className="dialog-actions">
        <ZuluButton type="button" className="outline-button" disabled={busy} onClick={onClose}>Cancelar</ZuluButton>
        <ZuluButton className="primary-button" disabled={busy}>{busy ? <CircleNotch className="spinning" size={17} /> : <Plus size={17} />}Criar organização</ZuluButton>
      </div>
    </ZuluForm>
  </HubDialog>;
}
