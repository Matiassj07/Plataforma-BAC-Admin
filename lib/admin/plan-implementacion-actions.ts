"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

async function notificarCliente(
  profileId: string,
  tipo: string,
  titulo: string,
  descripcion?: string,
  modulo?: string
) {
  const supabase = createAdminClient();
  await supabase.from("notificaciones_cliente").insert({
    profile_id: profileId,
    tipo,
    titulo,
    descripcion: descripcion ?? null,
    modulo: modulo ?? null,
  });
}

export async function crearPlan(
  clienteId: string,
  datos: {
    tipo: "rat" | "riesgos" | "documentos";
    actividad_origen_id?: string;
    titulo: string;
    responsable?: string;
    departamento?: string;
    actividad_nombre?: string;
    actividad_realizar?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("planes_implementacion").insert({
    profile_id: clienteId,
    tipo: datos.tipo,
    actividad_origen_id: datos.actividad_origen_id ?? null,
    titulo: datos.titulo,
    responsable: datos.responsable ?? null,
    departamento: datos.departamento ?? null,
    actividad_nombre: datos.actividad_nombre ?? null,
    actividad_realizar: datos.actividad_realizar ?? null,
    fecha_inicio: datos.fecha_inicio ?? null,
    fecha_fin: datos.fecha_fin ?? null,
    estado: "pendiente",
  });
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "plan", "Nuevo plan de implementación", `Se creó el plan: ${datos.titulo}`, "Plan");
  const { avanzarFlujoAutomatico } = await import("@/lib/admin/flujo-actions");
  await avanzarFlujoAutomatico(clienteId, "plan_implementacion", "Plan de implementación creado — avance automático");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

const CAMPOS_PLAN_PERMITIDOS = new Set([
  "titulo", "responsable", "departamento", "actividad_nombre",
  "actividad_realizar", "fecha_inicio", "fecha_fin", "estado",
]);

export async function actualizarPlan(
  planId: string,
  clienteId: string,
  datos: {
    titulo?: string;
    responsable?: string;
    departamento?: string;
    actividad_nombre?: string;
    actividad_realizar?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    estado?: string;
  }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(datos)) {
    if (CAMPOS_PLAN_PERMITIDOS.has(k) && v !== undefined) safe[k] = v;
  }
  if (Object.keys(safe).length === 0) return;
  const { error } = await supabase.from("planes_implementacion").update(safe).eq("id", planId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "plan", "Plan de implementación actualizado", `Se actualizó un plan`, "Plan");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarPlan(planId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("planes_implementacion").delete().eq("id", planId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "plan", "Plan de implementación eliminado", "Se eliminó un plan", "Plan");
  revalidatePath(`/admin/clientes/${clienteId}`);
}
