import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role. Bypassa RLS — usar SOLO en route handlers
 * del servidor que ya verificaron rol=admin (ver lib/auth.ts).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Project Settings > API > service_role)."
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
