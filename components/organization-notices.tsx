"use client";
import {useState} from 'react';
import {Button} from '@heroui/react';
import {HubDialog} from './hub-ui';
import {Bell,Crown} from '@phosphor-icons/react';
import type {Authority} from '@/lib/organization/model';
import type {HubController} from '@/lib/hub/use-hub';
import type {OrgCommand} from './organization-admin';
import {errorMessage} from '@/lib/supabase/errors';
export function OrganizationNotices({hub,authority,command}:{hub:HubController;authority:Authority|null;command:OrgCommand}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmTransfer,setConfirmTransfer]=useState(false);
 async function act(name:string,payload:Record<string,unknown>){if(busy)return;setBusy(true);setError('');try{await command(name,payload);await hub.refreshBootstrap();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 if(!authority)return null;
 const transfer=authority.transfers.find(t=>t.to_user===hub.userId),notice=authority.notices.find(n=>!n.read_at);
 return <>{transfer&&<div className="org-notice-banner"><Crown size={20}/><p>Você recebeu uma transferência de propriedade. Aceitar torna você responsável pela organização; o dono atual pode estar solicitando a saída junto com a transferência.</p><Button variant="primary" isDisabled={busy} onPress={()=>setConfirmTransfer(true)}>Aceitar coroa</Button><Button variant="secondary" isDisabled={busy} onPress={()=>void act('transfer_decide',{id:transfer.id,accept:false})}>Recusar</Button></div>}{notice&&<div className="org-notice-banner"><Bell size={18}/><p>{notice.message}</p><Button variant="ghost" isDisabled={busy} onPress={()=>void act('notice_read',{id:notice.id})}>Marcar como lido</Button></div>}{confirmTransfer&&transfer&&<HubDialog title="Aceitar a coroa" onClose={()=>{if(!busy)setConfirmTransfer(false);}}><div className="org-confirm"><p>Você passará a ser o único dono desta organização. O dono atual pode sair após a transferência. Confirme somente se deseja assumir essa responsabilidade.</p><Button variant="primary" isDisabled={busy} onPress={()=>void act('transfer_decide',{id:transfer.id,accept:true}).then(()=>setConfirmTransfer(false))}>Aceitar propriedade</Button></div></HubDialog>}{error&&<p role="alert" className="org-feedback org-error">{error}</p>}</>;
}
