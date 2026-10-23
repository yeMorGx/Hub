import {integrationSession,integrationJson} from '@/lib/integrations/session';
export async function GET(request:Request){
 const session=await integrationSession();if(!session)return integrationJson({error:'Entre com MFA.'},401);
 const params=new URL(request.url).searchParams;const workspace=params.get('workspace'),id=params.get('id');if(!workspace||!id)return integrationJson({error:'Documento inválido.'},400);
 const {data,error}=await session.client.rpc('library_console',{p_workspace_id:workspace,p_command:'download',p_payload:{id}});if(error||!data||typeof data!=='object'||Array.isArray(data))return integrationJson({error:'Sem permissão para baixar.'},403);
 if(typeof data.path==='string'){const file=await session.client.storage.from('organization-library').createSignedUrl(data.path,60,{download:typeof data.filename==='string'?data.filename:true});if(file.error)return integrationJson({error:'Arquivo indisponível.'},404);return integrationJson({url:file.data.signedUrl});}
 return new Response(String(data.body||''),{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="documento.md"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
