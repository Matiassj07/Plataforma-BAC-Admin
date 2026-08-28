"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export interface DatosPerfilAdmin {
  nombre_empresa: string;
  telefono: string | null;
  direccion: string | null;
  web: string | null;
}

export async function actualizarMiPerfil(datos: DatosPerfilAdmin) {
  const profile = await requireStaff();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      nombre_empresa: datos.nombre_empresa,
      telefono: datos.telefono || null,
      direccion: datos.direccion || null,
      web: datos.web || null,
    })
    .eq("id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/perfil");
}

export async function cambiarMiPassword(passwordActual: string, passwordNueva: string) {
  const profile = await requireStaff();
  const supabase = createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: passwordActual,
  });
  if (signInError) throw new Error("La contraseña actual es incorrecta.");

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(profile.id, {
    password: passwordNueva,
  });
  if (error) throw new Error(error.message);
}
