"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function guardarBacConfig(config: {
  id: number;
  nombre: string;
  correo_contacto: string | null;
  idioma: string;
  sitio_web: string | null;
}) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bac_config")
    .update({
      nombre: config.nombre,
      correo_contacto: config.correo_contacto || null,
      idioma: config.idioma,
      sitio_web: config.sitio_web || null,
    })
    .eq("id", config.id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracion");
}

export async function setProGlobalActivo(id: number, activo: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("bac_config").update({ pro_global_activo: activo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin/clientes");
}

export async function crearAdministrador(datos: { nombreEmpresa: string; email: string; password: string }) {
  const actor = await requireAdmin();
  if (!datos.nombreEmpresa.trim() || !datos.email.trim() || !datos.password) {
    throw new Error("Completa nombre, correo y contraseña.");
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: true,
    user_metadata: { nombre_empresa: datos.nombreEmpresa },
  });
  if (error) throw new Error(error.message);
  const userId = data.user.id;

  const supabase = createAdminClient();
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ nombre_empresa: datos.nombreEmpresa, rol: "admin", tipo_usuario: "interno_bac" })
    .eq("id", userId);
  if (updateError) throw new Error(updateError.message);

  await supabase.from("historial_acciones").insert({
    profile_id: userId,
    accion: `Cuenta de administrador creada por ${actor.email}`,
    modulo: "Configuración",
  });

  revalidatePath("/admin/configuracion");
}

export async function quitarAdministrador(adminId: string, actorId: string) {
  await requireAdmin();
  if (adminId === actorId) {
    throw new Error("No puedes quitarte el rol de administrador a ti mismo.");
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ rol: "cliente" }).eq("id", adminId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/configuracion");
}
