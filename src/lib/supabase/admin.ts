import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS. SERVER ONLY — never import into a
 * "use client" module. Used for the rare privileged read/write.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
