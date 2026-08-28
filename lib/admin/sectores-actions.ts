"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export interface SectorCustom {
  id: string;
  nombre: string;
  actividades: string[];
  created_at: string;
}

export async function obtenerSectoresCustom(): Promise<SectorCustom[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sectores_custom")
    .select("id, nombre, actividades, created_at")
    .order("nombre");
  if (error) return [];
  return (data ?? []) as SectorCustom[];
}

export async function crearSectorCustom(nombre: string, actividades: string[]) {
  await requireAdmin();
  if (!nombre.trim()) throw new Error("El nombre del sector es obligatorio.");
  if (actividades.length === 0) throw new Error("Agrega al menos una actividad.");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sectores_custom")
    .insert({ nombre: nombre.trim(), actividades });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/crear-usuario");
}

export async function eliminarSectorCustom(sectorId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("sectores_custom").delete().eq("id", sectorId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/crear-usuario");
}
