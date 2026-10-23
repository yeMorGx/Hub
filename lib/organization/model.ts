export const MODULES = [
  ["tasks", "Tarefas"], ["projects", "Projetos"], ["hours", "Horas"], ["calendar", "Agenda"], ["chat", "Conversas"], ["calls", "Chamadas"], ["documents", "Documentos"], ["checkins", "Check-ins"], ["people", "Pessoas"], ["reports", "Relatórios"], ["integrations", "Integrações"], ["management", "Gestão"],
] as const;
export const ACTIONS = { member_permissions:"Alterar permissões críticas",member_restore:"Reativar acesso à organização", workspace_admin:"Alterar administração geral",team_admin:"Alterar administração de time",team_member:"Incluir em outro time",member_remove:"Remover pessoa",member_suspend:"Suspender acesso",feature:"Alterar funcionalidade",team_delete:"Arquivar time",invite:"Autorizar convite",plan_change:"Mudança de plano" } as const;
export type Authority = { job_titles?:Record<string,string>; owner:boolean; general_admin:boolean; team_admin:boolean; can_approve:boolean; features:Record<string,boolean>;permissions:Record<string,Record<string,boolean>>;notices:{id:string;message:string;read_at:string|null;request_id:string|null}[];transfers:{id:string;from_user:string;to_user:string;leave_after:boolean}[] };
export const EMPTY_AUTHORITY: Authority = {owner:false,general_admin:false,team_admin:false,can_approve:false,features:{},permissions:{},notices:[],transfers:[]};
export type OrgMember={user_id:string;display_name:string;role:string;job_title:string;is_active:boolean;can_approve:boolean;access_state?:string};
export type Membership={user_id:string;team_id:string;is_active:boolean;is_team_admin:boolean;permissions:Record<string,boolean>};
export type Approval={id:string;action:keyof typeof ACTIONS;payload:Record<string,unknown>;reason:string;status:string;requested_by:string;approvers:string[];required_approvers:string[];quorum:number;created_at:string;expires_at:string;result_note:string|null};
export type OrgState={workspace:{id:string;name:string;owner_id:string};members:OrgMember[];teams:{id:string;name:string}[];memberships:Membership[];policies:{action:string;approvers:string[];required_approvers:string[];quorum:number;expires_days:number}[];requests:Approval[];votes:{request_id:string;user_id:string;decision:string;reason:string}[];activity:{id:string;action:string;actor_id:string;created_at:string;details:Record<string,unknown>}[];invitations:{id:string;email:string;team_id:string;expires_at:string;accepted_at:string|null;revoked_at:string|null}[];invite_authorizations:{id:string;config:{email:string};expires_at:string}[]};
export const PAGE_MODULE:Record<string,string>={"organization-chat":"chat",board:"tasks",hours:"hours",calendar:"calendar",chat:"chat",calls:"calls",notes:"documents",library:"documents",meetings:"documents",standups:"checkins",people:"people",reports:"reports",integrations:"integrations",goals:"hours",clients:"management",shifts:"management",absences:"management",dates:"calendar"};
export function allowedPage(authority: Authority|null,page:string,teamId:string){ const module=PAGE_MODULE[page];if(!module)return true;if(!authority)return false;if(page==="library")return authority.features.documents!==false;return authority.features[module]!==false&&(authority.owner||authority.permissions[teamId]?.[`${module}.view`]!==false); }

export const denyPermissions = () => Object.fromEntries(MODULES.flatMap(([module]) => ['view','write','manage'].map(action => [`${module}.${action}`,false])));
export function effectivePermissions(stored:Record<string,boolean>,generalAdmin:boolean,teamAdmin:boolean){
 return Object.fromEntries(MODULES.flatMap(([module])=>['view','write','manage'].map(action=>{const key=`${module}.${action}`;const fallback=action==='manage'?(module==='reports'?generalAdmin:generalAdmin||teamAdmin):module==='projects'&&action==='write'?generalAdmin||teamAdmin:true;return [key,stored[key]??fallback];})));
}
export function changePermission(value:Record<string,boolean>,module:string,action:string,enabled:boolean){
 const next={...value,[`${module}.${action}`]:enabled};
 if(action==='view'&&!enabled){next[`${module}.write`]=false;next[`${module}.manage`]=false;}
 if(enabled&&action!=='view')next[`${module}.view`]=true;
 if(enabled&&action==='manage')next[`${module}.write`]=true;
 return next;
}

export const MANAGED_MODULES = new Set(["tasks","projects","hours","calendar","chat","documents","reports","management"]);
export const READ_ONLY_MODULES = new Set(["people","reports"]);
