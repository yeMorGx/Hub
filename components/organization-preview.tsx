"use client";
import {useMemo,useState} from 'react';
import type {HubController} from '@/lib/hub/use-hub';
import {OrganizationAdmin} from './organization-admin';
import {OrganizationLibrary,type LibraryState} from './organization-library';
import {EMPTY_AUTHORITY,type Authority,type OrgState} from '@/lib/organization/model';
export function OrganizationPreview({hub,library=false}:{hub:HubController;library?:boolean}){
 const initial=useMemo(()=>({workspace:{id:hub.workspace?.id||'demo-workspace',name:'Forma',owner_id:hub.userId},members:hub.snapshot.people.map((p,i)=>({user_id:p.id,display_name:p.display_name,job_title:['Direção de produto','Design de produto','Desenvolvimento'][i]||'Operações',role:i===0?'admin':'member',is_active:true,can_approve:i===1})),teams:[{id:'studio',name:'Estúdio'},{id:'engineering',name:'Engenharia'}],memberships:hub.snapshot.people.map((p,i)=>({user_id:p.id,team_id:'studio',is_active:true,is_team_admin:i===0,permissions:{}})),policies:[],requests:[{id:'demo-request',action:'feature' as const,payload:{feature:'calls',enabled:false},reason:'Concentrar as chamadas no serviço de reuniões da organização.',requested_by:hub.snapshot.people[1].id,status:'pending',quorum:1,approvers:[hub.userId],required_approvers:[],created_at:new Date().toISOString(),expires_at:new Date(Date.now()+7*86400000).toISOString(),result_note:null}],votes:[],activity:[{id:'demo-activity',action:'member_permissions',actor_id:hub.userId,created_at:new Date().toISOString(),details:{team:'Estúdio',person:hub.snapshot.people[2].display_name}}],invitations:[],invite_authorizations:[]} as OrgState),[hub]);
 const [state,setState]=useState(initial),[authority,setAuthority]=useState<Authority>({...EMPTY_AUTHORITY,owner:true,general_admin:true,team_admin:true});
 const [libraryState,setLibraryState]=useState<LibraryState>(()=>({nodes:[{id:'library-team',parent_id:null,team_id:'studio',kind:'library',title:'Conhecimento do Estúdio',sensitive:false,created_by:hub.userId,responsible_id:hub.userId,version:1,filename:null,can_write:true,can_download:true,can_share:true,updated_at:new Date().toISOString()},{id:'library-doc',parent_id:'library-team',team_id:'studio',kind:'document',title:'Guia de trabalho do time',sensitive:false,created_by:hub.userId,responsible_id:hub.userId,version:1,filename:null,can_write:true,can_download:true,can_share:true,updated_at:new Date().toISOString()},{id:'library-sensitive',parent_id:'library-team',team_id:'studio',kind:'document',title:'Planejamento reservado',sensitive:true,created_by:hub.userId,responsible_id:hub.userId,version:1,filename:null,can_write:true,can_download:true,can_share:true,updated_at:new Date().toISOString()}],people:hub.snapshot.people.map(p=>({id:p.id,name:p.display_name})),teams:initial.teams,requests:[]}));
 const [bodies,setBodies]=useState<Record<string,string>>({'library-doc':'# Nosso jeito de trabalhar\n\nUm espaço para reunir contexto, processos e decisões do Estúdio.\n\n## Antes de começar\n\n- Confira as tarefas da semana.\n- Compartilhe o contexto com as pessoas certas.\n- Registre decisões para que todos possam acompanhar.\n\n## Compartilhamento\n\nO acesso a este documento pode ser concedido sem abrir o restante da biblioteca.','library-sensitive':'# Planejamento reservado\n\nEste documento exige aprovação do responsável a cada novo compartilhamento.'});
 async function command(name:string,p:Record<string,unknown>={}){
 if(name==='request'){const d=p.data as Record<string,unknown>;
 if(p.action==='member_permissions')setState(s=>({...s,members:s.members.map(m=>m.user_id===d.user_id?{...m,job_title:String(d.job_title)}:m),memberships:s.memberships.map(m=>m.user_id===d.user_id&&m.team_id===d.team_id?{...m,permissions:d.permissions as Record<string,boolean>}:m)}));
 if(p.action==='feature')setAuthority(a=>({...a,features:{...a.features,[String(d.feature)]:Boolean(d.enabled)}}));return {executed:true};}
 if(name==='decide')setState(s=>({...s,requests:s.requests.map(r=>r.id===p.id?{...r,status:p.decision==='approve'?'executed':p.decision==='reject'?'rejected':'cancelled'}:r)}));
 if(name==='approver')setState(s=>({...s,members:s.members.map(m=>m.user_id===p.user_id?{...m,can_approve:Boolean(p.enabled)}:m)}));
 if(name==='policy')setState(s=>({...s,policies:[...s.policies.filter(a=>a.action!==p.action),p as OrgState['policies'][number]]}));return {};
 }
 async function libraryCall(name:string,p:Record<string,unknown>={}){
 const node=libraryState.nodes.find(n=>n.id===p.id);if(name==='read')return {...node,body:bodies[String(p.id)]||'',object_path:null};
 if(name==='save'){setBodies(s=>({...s,[String(p.id)]:String(p.body)}));setLibraryState(s=>({...s,nodes:s.nodes.map(n=>n.id===p.id?{...n,title:String(p.title),version:n.version+1}:n)}));}
 if(name==='sensitivity')setLibraryState(s=>({...s,nodes:s.nodes.map(n=>n.id===p.id?{...n,sensitive:Boolean(p.sensitive)}:n)}));
 if(name==='create'){const id=crypto.randomUUID();setLibraryState(s=>({...s,nodes:[...s.nodes,{id,parent_id:p.parent_id as string|null,team_id:p.team_id as string|null,kind:String(p.kind),title:String(p.title),sensitive:Boolean(p.sensitive),created_by:hub.userId,responsible_id:hub.userId,version:1,filename:null,can_write:true,can_download:true,can_share:true}]}));setBodies(s=>({...s,[id]:String(p.body||'')}));return {id};}
 if(name==='grants')return [];return {};
 }
 return library?<OrganizationLibrary hub={hub} fixture={libraryState} fixtureCall={libraryCall}/>:<OrganizationAdmin hub={hub} authority={authority} command={command} fixture={state}/>;
}
