import {sameOrigin,appOrigin} from '@/lib/integrations/config';
import {integrationSession,integrationJson} from '@/lib/integrations/session';
import {invitationToken} from '@/lib/invitations/token';
import {errorMessage} from '@/lib/supabase/errors';
export async function POST(request:Request){
 if(!sameOrigin(request))return integrationJson({error:'Origem inválida.'},403);
 const session=await integrationSession();if(!session)return integrationJson({error:'Entre com MFA.'},401);
 try{const text=await request.text();if(text.length>1024)throw Error();const body=JSON.parse(text);if(typeof body.authorizationId!=='string')throw Error();const {token,hash}=invitationToken();const {data,error}=await session.client.rpc('issue_organization_invite',{p_authorization_id:body.authorizationId,p_token_hash:hash});if(error)return integrationJson({error:errorMessage(error)},error.code==='42501'?403:400);return integrationJson({invitation:data,url:`${appOrigin}/invite#token=${token}`},201);}catch{return integrationJson({error:'Não foi possível emitir o convite.'},400);}
}
