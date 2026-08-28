import { createAdminClient } from "@/lib/supabase/admin";

export interface ConfigCorreo {
  id?: string;
  admin_id?: string;
  proveedor: "outlook" | "smtp_personalizado" | null;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  tls?: boolean;
  nombre_remitente?: string;
  email_respuesta?: string;
  activo: boolean;
}

export interface PlantillaCorreo {
  id: string;
  tipo: string;
  asunto: string;
  cuerpo: string;
  updated_at: string;
}

export interface HistorialCorreo {
  id: string;
  destinatario_id: string | null;
  asunto: string;
  tipo: string;
  estado: "enviado" | "pendiente" | "error";
  error_detalle?: string;
  created_at: string;
}

export async function getConfigCorreo(): Promise<ConfigCorreo | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("config_correo").select("*").maybeSingle();
    if (error) return null;
    return (data as ConfigCorreo) || null;
  } catch {
    return null;
  }
}

export async function getPlantillasCorreo(): Promise<PlantillaCorreo[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("plantillas_correo")
      .select("id,tipo,asunto,cuerpo,updated_at")
      .order("tipo", { ascending: true });
    if (error) return [];
    return (data ?? []) as PlantillaCorreo[];
  } catch {
    return [];
  }
}

export interface ClienteCorreo {
  id: string;
  nombre_empresa: string;
  email: string;
}

export async function getClientesParaCorreo(): Promise<ClienteCorreo[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nombre_empresa, email")
      .eq("rol", "cliente")
      .eq("suspendido", false)
      .order("nombre_empresa");
    if (error) return [];
    return (data ?? []) as ClienteCorreo[];
  } catch {
    return [];
  }
}

export async function getHistorialCorreos(limit = 50): Promise<HistorialCorreo[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("historial_correos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as HistorialCorreo[];
  } catch {
    return [];
  }
}
