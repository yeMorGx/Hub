import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database.types';
export async function hasOrganizationPermission(client:SupabaseClient<Database>,teamId:string,capability:string){const r=await client.rpc('organization_permission',{p_team_id:teamId,p_capability:capability});return !r.error&&r.data===true;}
