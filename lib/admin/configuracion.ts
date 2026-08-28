import { createAdminClient } from "@/lib/supabase/admin";
import type { BacConfig, AdminItem } from "./configuracion-types";

export type { BacConfig, AdminItem } from "./configuracion-types";

export async function getBacConfig(): Promise<BacConfig | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("bac_config").select("*").maybeSingle();
  return (data as BacConfig) || null;
}

export async function getAdministradores(): Promise<AdminItem[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, nombre_empresa, created_at")
    .eq("rol", "admin")
    .order("created_at");

  return (data ?? []) as AdminItem[];
}
