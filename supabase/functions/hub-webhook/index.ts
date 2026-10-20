import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
Deno.serve(async request=>{
 if(request.method!=='POST')return respond({error:'Method not allowed'},405);
 const id=new URL(request.url).pathname.split('/').filter(Boolean).at(-1),token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
 if(!id||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)||!token)return respond({error:'Invalid webhook'},403);
 try{const reader=request.body?.getReader();if(!reader)return respond({error:'Invalid payload'},400);let size=0;const chunks:Uint8Array[]=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>48000){await reader.cancel();return respond({error:'Payload too large'},413);}chunks.push(value);}const combined=new Uint8Array(size);let position=0;for(const chunk of chunks){combined.set(chunk,position);position+=chunk.length;}const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(combined));
 if(typeof input.text!=='string'||typeof input.event_id!=='string'||input.text.length>10000||input.event_id.length>200)return respond({error:'Use text and event_id'},400);
 const {data,error}=await admin.rpc('accept_incoming_webhook',{p_webhook_id:id,p_token:token,p_body:input.text,p_event_id:input.event_id});
 if(error)return respond({error:error.code==='53300'?'Rate limit exceeded':'Invalid webhook'},error.code==='53300'?429:403);
 return respond({ok:true,message_id:data});
 }catch{return respond({error:'Invalid payload'},400);}
});
