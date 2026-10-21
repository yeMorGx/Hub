import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';
import { timingSafeEqual } from 'node:crypto';
const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const allowedOrigins=new Set(['https://hub-one-azure.vercel.app','http://localhost:3000','http://127.0.0.1:3000']);
let configCache:{value:{public_key:string;private_key:string;job_secret:string};until:number}|null=null;
async function configuration(){if(configCache&&configCache.until>Date.now())return configCache.value;const {data,error}=await admin.rpc('delivery_configuration');if(error||!data)throw new Error('Delivery configuration unavailable');configCache={value:data,until:Date.now()+60000};return data;}
function equal(a:string,b:string){const encoder=new TextEncoder(),x=encoder.encode(a),y=encoder.encode(b);return x.length===y.length&&timingSafeEqual(x,y);}
function validEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname));}catch{return false;}}
async function activeRecipient(userId:string,teamId:string,channelId:string|null){
 const {data:team,error:tErr}=await admin.from('teams').select('workspace_id').eq('id',teamId).single();if(tErr||!team)return false;
 const [{data:member},{data:workspace}]=await Promise.all([admin.from('team_members').select('is_active').eq('team_id',teamId).eq('user_id',userId).maybeSingle(),admin.from('workspace_members').select('is_active').eq('workspace_id',team.workspace_id).eq('user_id',userId).maybeSingle()]);
 if(!member?.is_active||!workspace?.is_active)return false;
 if(channelId){const {data:channelMember}=await admin.from('channel_members').select('user_id').eq('channel_id',channelId).eq('user_id',userId).maybeSingle();if(!channelMember)return false;}
 return true;
}
async function queueReminders(){
 const now=new Date(),soon=new Date(now.getTime()+15*60000);
 const {data:events,error}=await admin.from('events').select('id,team_id,starts_at').is('cancelled_at',null).gte('starts_at',now.toISOString()).lte('starts_at',soon.toISOString()).limit(100);if(error)throw error;
 for(const event of events||[]){const {data:attendees,error}=await admin.from('event_attendees').select('user_id,response').eq('event_id',event.id).neq('response','declined');if(error)throw error;for(const attendee of attendees||[]){if(!await activeRecipient(attendee.user_id,event.team_id,null))continue;const {error:insertError}=await admin.from('notifications').upsert({user_id:attendee.user_id,team_id:event.team_id,event_id:event.id,kind:'meeting',dedupe_key:`meeting:${event.id}:${Math.floor(Date.parse(event.starts_at)/1000)}:15m`},{onConflict:'user_id,dedupe_key',ignoreDuplicates:true});if(insertError)throw insertError;}}
 const {data:timers,error:timerError}=await admin.from('time_entries').select('id,team_id,user_id').is('ended_at',null).lt('started_at',new Date(now.getTime()-30*60000).toISOString()).limit(100);if(timerError)throw timerError;
 for(const timer of timers||[]){const {data:goal}=await admin.from('time_goals').select('forgotten_after_minutes').eq('team_id',timer.team_id).eq('user_id',timer.user_id).maybeSingle();const limit=goal?.forgotten_after_minutes||480;const {data:entry}=await admin.from('time_entries').select('started_at').eq('id',timer.id).single();if(!entry||new Date(entry.started_at).getTime()+limit*60000>now.getTime())continue;if(!await activeRecipient(timer.user_id,timer.team_id,null))continue;await admin.from('notifications').upsert({user_id:timer.user_id,team_id:timer.team_id,kind:'timer',dedupe_key:`timer:${timer.id}:forgotten`},{onConflict:'user_id,dedupe_key',ignoreDuplicates:true});}
}
Deno.serve(async request=>{
 const origin=request.headers.get('Origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://hub-one-azure.vercel.app','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST'||(origin&&!allowedOrigins.has(origin)))return respond({error:'Forbidden'},403);
 try{
  const raw=await request.text();if(raw.length>2000)return respond({error:'Payload too large'},413);
  const input=JSON.parse(raw);const cfg=await configuration();let messageId:string|undefined;
  const token=request.headers.get('Authorization')?.replace(/^Bearer /i,'')||'';
  if(input.job==='reminders'){
   if(!token||!equal(token,cfg.job_secret))return respond({error:'Unauthorized'},401);
   await queueReminders();
   const {error:homeOfficeError}=await admin.rpc('queue_home_office_reminders');if(homeOfficeError)throw homeOfficeError;
  }else{
   if(typeof input.message_id!=='string'||!/^[0-9a-f-]{36}$/i.test(input.message_id))return respond({error:'Invalid message'},400);
   const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:request.headers.get('Authorization')||''}},auth:{persistSession:false}});
   const {data:claims,error:claimError}=await user.auth.getClaims(token);
   if(claimError||claims?.claims.aal!=='aal2')return respond({error:'Unauthorized'},401);
   const {data:message,error}=await user.from('messages').select('id,author_id').eq('id',input.message_id).single();
   if(error||message?.author_id!==claims.claims.sub)return respond({error:'Forbidden'},403);
   messageId=message.id;
  }
  const {data:notifications,error}=await admin.rpc('claim_notification_deliveries',messageId?{p_message_id:messageId}:{});if(error)throw error;
  let sent=0;
  async function deliver(n:{id:string;user_id:string;team_id:string;channel_id:string|null;message_id:string|null;event_id:string|null;dedupe_key:string;kind:string}){
   if(!await activeRecipient(n.user_id,n.team_id,n.channel_id)){await admin.from('notifications').update({delivered_at:new Date().toISOString()}).eq('id',n.id);return;}
   if(n.message_id){const {data:m}=await admin.from('messages').select('deleted_at').eq('id',n.message_id).maybeSingle();if(!m||m.deleted_at){await admin.from('notifications').update({delivered_at:new Date().toISOString()}).eq('id',n.id);return;}}
   if(n.kind==='meeting'&&n.event_id){const {data:e}=await admin.from('events').select('cancelled_at,starts_at,created_by').eq('id',n.event_id).maybeSingle();const {data:a}=await admin.from('event_attendees').select('response').eq('event_id',n.event_id).eq('user_id',n.user_id).maybeSingle();if(!e||e.cancelled_at||Date.parse(e.starts_at)<Date.now()||!n.dedupe_key.endsWith(`:${Math.floor(Date.parse(e.starts_at)/1000)}:15m`)||(e.created_by!==n.user_id&&(!a||a.response==='declined'))){await admin.from('notifications').update({delivered_at:new Date().toISOString()}).eq('id',n.id);return;}}
   if(n.kind==='timer'){const id=n.dedupe_key.split(':')[1];const {data:e}=await admin.from('time_entries').select('ended_at').eq('id',id).eq('user_id',n.user_id).maybeSingle();if(!e||e.ended_at){await admin.from('notifications').update({delivered_at:new Date().toISOString()}).eq('id',n.id);return;}}
   let pushTitle='ZULU',pushBody=n.kind==='message'?'Você recebeu uma nova mensagem direta.':n.kind==='mention'?'Você recebeu uma nova menção.':n.kind==='meeting'?'Uma reunião começa nos próximos 15 minutos.':n.kind==='timer'?'Seu timer passou do limite de alerta configurado.':'Há uma atualização para você.';
   if(n.kind==='home_office') {pushTitle='Seu home office é hoje';pushBody='Hoje é seu dia de home office. Confira a escala da equipe no calendário.';}
   if(n.kind==='home_office_swap'){
    const isResult=n.dedupe_key.startsWith('home_office_swap_result:');
    const requestId=n.dedupe_key.slice(isResult?'home_office_swap_result:'.length:'home_office_swap:'.length);
    const {data:swap}=await admin.from('home_office_swaps').select('id,team_id,requested_by,target_user_id,status').eq('id',requestId).maybeSingle();
    if(!swap||swap.team_id!==n.team_id||(isResult?(!['accepted','declined'].includes(swap.status)||swap.requested_by!==n.user_id):(swap.status!=='pending'||swap.target_user_id!==n.user_id))){await admin.from('notifications').update({delivered_at:new Date().toISOString()}).eq('id',n.id);return;}
    if(isResult){pushTitle=swap.status==='accepted'?'Troca de home office confirmada':'Pedido de troca recusado';pushBody=swap.status==='accepted'?'A outra pessoa aceitou. A escala do calendário foi atualizada.':'A outra pessoa não pôde trocar o dia de home office.';}
    else {const {data:requester}=await admin.from('profiles').select('display_name').eq('id',swap.requested_by).maybeSingle();pushTitle='Pedido de troca de home office';pushBody=`${requester?.display_name||'Uma pessoa do time'} pediu para trocar o dia de home office.`;}
   }
   const {data:subscriptions,error}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth_key').eq('user_id',n.user_id);if(error)throw error;
   let retry=false;
   await Promise.all((subscriptions||[]).map(async s=>{
    if(!validEndpoint(s.endpoint)){await admin.from('push_subscriptions').delete().eq('id',s.id);return;}
    try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_key}},JSON.stringify({id:n.id,title:pushTitle,body:pushBody,url:'https://hub-one-azure.vercel.app/?inbox=1'}),{vapidDetails:{subject:'https://hub-one-azure.vercel.app',publicKey:cfg.public_key,privateKey:cfg.private_key},TTL:900,timeout:5000});sent++;}
    catch(e){const status=(e as {statusCode?:number}).statusCode;if(status===404||status===410)await admin.from('push_subscriptions').delete().eq('id',s.id);else retry=true;}
   }));
   if(!retry)await admin.from('notifications').update({delivered_at:new Date().toISOString()}).eq('id',n.id);
  }
  const rows=notifications||[];
  for(let i=0;i<rows.length;i+=5)await Promise.all(rows.slice(i,i+5).map(deliver));
  return respond({ok:true,processed:rows.length,sent});
 }catch{return respond({error:'Unable to process notifications'},500);}
});
