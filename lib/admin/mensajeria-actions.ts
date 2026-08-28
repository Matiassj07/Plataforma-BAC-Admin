"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function getTareasPorCliente(profileId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("mensajeria_tareas")
    .select("*, mensajeria_checklist(id, texto, completado, orden)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

export async function getClientesParaMensajeria() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nombre_empresa")
    .eq("rol", "cliente")
    .order("nombre_empresa");
  return (data ?? []) as { id: string; nombre_empresa: string }[];
}

export async function crearTarea(
  profileId: string,
  titulo: string,
  descripcion?: string,
  prioridad?: string,
  fechaLimite?: string
) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mensajeria_tareas")
    .insert({
      profile_id: profileId,
      admin_id: admin.id,
      titulo,
      descripcion: descripcion || null,
      prioridad: prioridad || "media",
      fecha_limite: fechaLimite || null,
      estado: "pendiente",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
  return data.id;
}

export async function actualizarTarea(
  tareaId: string,
  updates: { titulo?: string; descripcion?: string | null; prioridad?: string; fecha_limite?: string | null }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mensajeria_tareas")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", tareaId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
}

export async function moverTarea(tareaId: string, nuevoEstado: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mensajeria_tareas")
    .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
    .eq("id", tareaId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
}

export async function eliminarTarea(tareaId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mensajeria_tareas")
    .delete()
    .eq("id", tareaId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
}

export async function agregarChecklistItem(tareaId: string, texto: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: maxOrden } = await supabase
    .from("mensajeria_checklist")
    .select("orden")
    .eq("tarea_id", tareaId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("mensajeria_checklist")
    .insert({ tarea_id: tareaId, texto, orden: (maxOrden?.orden ?? -1) + 1 });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
}

export async function toggleChecklistItem(itemId: string, completado: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mensajeria_checklist")
    .update({ completado })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
}

export async function eliminarChecklistItem(itemId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mensajeria_checklist")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/mensajeria");
}
