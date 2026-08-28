"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface Herramienta {
  id: string;
  titulo: string;
  subtitulo: string | null;
  descripcion: string | null;
  url: string;
  tipo: "video" | "enlace";
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

export async function getHerramientas(): Promise<Herramienta[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("herramientas")
      .select("*")
      .order("orden", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Herramienta[];
  } catch {
    return [];
  }
}

export async function crearHerramienta(values: {
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  url: string;
  tipo: "video" | "enlace";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("herramientas")
      .select("id", { count: "exact", head: true });
    const { error } = await supabase.from("herramientas").insert({
      titulo: values.titulo,
      subtitulo: values.subtitulo || null,
      descripcion: values.descripcion || null,
      url: values.url,
      tipo: values.tipo,
      orden: (count ?? 0),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function actualizarHerramienta(
  id: string,
  values: {
    titulo?: string;
    subtitulo?: string;
    descripcion?: string;
    url?: string;
    tipo?: "video" | "enlace";
    activo?: boolean;
    orden?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("herramientas")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function eliminarHerramienta(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("herramientas").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
