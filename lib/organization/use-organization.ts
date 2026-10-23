"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import type { HubController } from "@/lib/hub/use-hub";
import type { Json } from "@/lib/supabase/database.types";
import type { Authority } from "./model";
export function useOrganization(hub:HubController){
 const [authority,setAuthority]=useState<Authority|null>(null),[error,setError]=useState("");const generation=useRef(0);
 const workspaceId=hub.workspace?.id;
 const refresh=useCallback(async()=>{const id=++generation.current;if(!workspaceId){setAuthority(null);return;}const {data,error}=await hub.client.rpc('organization_console',{p_workspace_id:workspaceId,p_command:'capabilities'});if(id!==generation.current)return;if(error){setAuthority(null);setError("Não foi possível conferir seu acesso. Tente atualizar.");}else{setAuthority(data as unknown as Authority);setError("");}},[hub.client,workspaceId]);
 useEffect(()=>{setAuthority(null);void refresh();const reload=()=>{if(!document.hidden)void refresh();};const timer=setInterval(reload,15000);document.addEventListener('visibilitychange',reload);window.addEventListener('zulu:organization-changed',reload);return()=>{generation.current++;clearInterval(timer);document.removeEventListener('visibilitychange',reload);window.removeEventListener('zulu:organization-changed',reload);};},[refresh]);
 const command=useCallback(async(name:string,payload:Record<string,unknown>={})=>{if(!workspaceId)throw Error('Selecione uma organização.');const r=await hub.client.rpc('organization_console',{p_workspace_id:workspaceId,p_command:name,p_payload:payload as Json});if(r.error)throw r.error;window.dispatchEvent(new Event('zulu:organization-changed'));return r.data;},[hub.client,workspaceId]);
 return {authority,error,refresh,command};
}
