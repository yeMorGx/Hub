import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";
import type { Database } from "./database.types";
export function createClient() {
  const { url, key } = supabaseConfig();
  // The SDK reuses its client only in the browser. Never cache an Auth client
  // in a server module: Client Components also render on the server.
  return createBrowserClient<Database>(url, key);
}
