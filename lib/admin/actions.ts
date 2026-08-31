"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
async function notificar(supabase: ReturnType<typeof createAdminClient>, profileId: string, tipo: string, titulo: string, descripcion?: string, modulo?: string) {
  await supabase.from("notificaciones_cliente").insert({
    profile_id: profileId, tipo, titulo, descripcion: descripcion ?? null, modulo: modulo ?? null,
  });
}

export async function setProAprobado(clienteId: string, aprobado: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      pro_aprobado_por_admin: aprobado,
      pro_activado_en: aprobado ? new Date().toISOString() : null,
    })
    .eq("id", clienteId);
  if (error) throw new Error(error.message);
  await notificar(supabase, clienteId, "cuenta", aprobado ? "PRO activado" : "PRO desactivado", aprobado ? "Se activó la visibilidad PRO de tu cuenta" : "Se desactivó la visibilidad PRO de tu cuenta", "Cuenta");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/configuracion");
}

export async function setSuspendido(clienteId: string, suspendido: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ suspendido }).eq("id", clienteId);
  if (error) throw new Error(error.message);
  await notificar(supabase, clienteId, "cuenta", suspendido ? "Cuenta suspendida" : "Cuenta reactivada", suspendido ? "Tu cuenta fue suspendida por el administrador" : "Tu cuenta fue reactivada", "Cuenta");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export interface DatosEdicionCliente {
  nombre_empresa: string;
  sector: string | null;
  telefono: string | null;
  ruc: string | null;
  direccion: string | null;
  web: string | null;
}

export async function actualizarCliente(clienteId: string, datos: DatosEdicionCliente) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update(datos).eq("id", clienteId);
  if (error) throw new Error(error.message);
  await notificar(supabase, clienteId, "cuenta", "Datos actualizados", "Se actualizaron los datos de tu empresa", "Cuenta");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarCliente(clienteId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createAdminClient();

  try {
    // Delete dependent data that may lack ON DELETE CASCADE
    // Ignore errors from tables that might not exist yet
    const tablas = [
      { tabla: "planes_implementacion", col: "profile_id" },
      { tabla: "notificaciones_cliente", col: "profile_id" },
      { tabla: "mensajes_kanban", col: "profile_id" },
      { tabla: "historial_acciones", col: "profile_id" },
      { tabla: "historial_correos", col: "destinatario_id" },
      { tabla: "score_historial", col: "profile_id" },
      { tabla: "documentos_generales", col: "profile_id" },
      { tabla: "brechas_seguridad", col: "profile_id" },
      { tabla: "flujo_estados", col: "profile_id" },
      { tabla: "integraciones_almacenamiento", col: "profile_id" },
      { tabla: "analisis_ia", col: "profile_id" },
      { tabla: "cambios_campo_rat", col: "profile_id" },
    ];
    for (const { tabla, col } of tablas) {
      await supabase.from(tabla).delete().eq(col, clienteId);
    }

    // Mensajería: checklist depende de tareas
    const { data: tareas } = await supabase
      .from("mensajeria_tareas")
      .select("id")
      .eq("profile_id", clienteId);
    if (tareas && tareas.length > 0) {
      const tareaIds = tareas.map((t) => t.id);
      await supabase.from("mensajeria_checklist").delete().in("tarea_id", tareaIds);
    }
    await supabase.from("mensajeria_tareas").delete().eq("profile_id", clienteId);

    // DPD chain: actas → actividades → informes → planes
    const { data: dpdPlanes } = await supabase
      .from("dpd_planes")
      .select("id")
      .eq("profile_id", clienteId);
    if (dpdPlanes && dpdPlanes.length > 0) {
      const planIds = dpdPlanes.map((p) => p.id);
      await supabase.from("dpd_actas").delete().in("plan_id", planIds);
      await supabase.from("dpd_actividades").delete().in("plan_id", planIds);
      await supabase.from("dpd_informes_brechas").delete().in("plan_id", planIds);
    }
    await supabase.from("dpd_planes").delete().eq("profile_id", clienteId);

    // RAT chain: actividades → versiones
    const { data: ratVersiones } = await supabase
      .from("rat_versiones")
      .select("id")
      .eq("profile_id", clienteId);
    if (ratVersiones && ratVersiones.length > 0) {
      const versionIds = ratVersiones.map((v) => v.id);
      await supabase.from("actividades_rat").delete().in("rat_version_id", versionIds);
    }
    await supabase.from("rat_versiones").delete().eq("profile_id", clienteId);

    // Riesgos chain
    const { data: matrizVersiones } = await supabase
      .from("matriz_versiones")
      .select("id")
      .eq("profile_id", clienteId);
    if (matrizVersiones && matrizVersiones.length > 0) {
      const versionIds = matrizVersiones.map((v) => v.id);
      await supabase.from("actividades_riesgo").delete().in("matriz_version_id", versionIds);
    }
    await supabase.from("matriz_versiones").delete().eq("profile_id", clienteId);

    // Carpetas y documentos de carpeta
    const { data: carpetas } = await supabase
      .from("carpetas_documentos")
      .select("id")
      .eq("profile_id", clienteId);
    if (carpetas && carpetas.length > 0) {
      const carpetaIds = carpetas.map((c) => c.id);
      await supabase.from("documentos_carpeta").delete().in("carpeta_id", carpetaIds);
    }
    await supabase.from("carpetas_documentos").delete().eq("profile_id", clienteId);

    // Personal del cliente
    await supabase.from("personal_cliente").delete().eq("profile_id", clienteId);

    // Delete the auth user (which cascades to profiles via Supabase trigger)
    const { error } = await supabase.auth.admin.deleteUser(clienteId);
    if (error) {
      console.error("[eliminarCliente] deleteUser error:", error);
      return { ok: false, error: error.message || "Error al eliminar el usuario de autenticación." };
    }

    revalidatePath("/admin/clientes");
    return { ok: true };
  } catch (err) {
    console.error("[eliminarCliente] Error:", clienteId, err);
    const msg = err instanceof Error ? err.message : "Error inesperado al eliminar el cliente.";
    return { ok: false, error: msg };
  }
}

export async function actualizarCredencialesCliente(clienteId: string, password: string) {
  await requireAdmin();

  if (!password.trim()) {
    throw new Error("La contraseña no puede estar vacía.");
  }

  const supabaseAdmin = createAdminClient();

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(clienteId, {
    password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const supabase = createAdminClient();

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "Contraseña restablecida por administrador",
    modulo: "Cuenta",
  });
  await notificar(supabase, clienteId, "cuenta", "Contraseña actualizada", "Tu contraseña fue restablecida por el administrador", "Cuenta");

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

