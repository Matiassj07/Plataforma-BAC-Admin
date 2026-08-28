import { createAdminClient } from "@/lib/supabase/admin";
import type { ConfigNotificaciones, HistorialNotificacion } from "./notificaciones-types";

export type { ConfigNotificaciones, HistorialNotificacion } from "./notificaciones-types";
export { TIPOS_ALERTA } from "./notificaciones-types";

export async function getConfigNotificaciones(): Promise<ConfigNotificaciones | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("notificaciones_globales").select("*").maybeSingle();
  return (data as ConfigNotificaciones) || null;
}

export async function getHistorialNotificaciones(limit = 50): Promise<HistorialNotificacion[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("historial_notificaciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as HistorialNotificacion[];
}
