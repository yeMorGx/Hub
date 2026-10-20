import { AuthScreen } from "@/components/auth/auth-screen";
import { hasSupabaseConfig } from "@/lib/supabase/config";
export default function LoginPage() {
  return <AuthScreen configured={hasSupabaseConfig()} />;
}
