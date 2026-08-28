import { createAdminClient } from "@/lib/supabase/admin";

export type ProveedorAlmacenamiento = "sharepoint" | "onedrive";

export interface IntegracionAlmacenamiento {
  id: string;
  admin_id: string;
  proveedor: ProveedorAlmacenamiento;
  access_token: string | null;
  refresh_token: string | null;
  token_expira: string | null;
  carpeta_destino: string | null;
  activo: boolean;
  sync_automatica: boolean;
  ultima_sync: string | null;
  created_at: string;
}

export async function getIntegracionesAlmacenamiento(): Promise<IntegracionAlmacenamiento[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("integraciones_almacenamiento")
    .select("*")
    .order("created_at", { ascending: true });

  return (data ?? []) as IntegracionAlmacenamiento[];
}
