"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function subirActaFirmada(actaId: string, formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado.");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");

  const supabase = createClient();

  const { data: acta } = await supabase
    .from("dpd_actas")
    .select("id, dpd_planes!inner(profile_id)")
    .eq("id", actaId)
    .single();

  if (!acta || (acta as any).dpd_planes?.profile_id !== profile.id) {
    throw new Error("No tienes acceso a esta acta.");
  }

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${profile.id}/acta-${actaId}-firmada-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("actas-dpd").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase
    .from("dpd_actas")
    .update({ url_acta_firmada: path, estado: "firmada" })
    .eq("id", actaId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/dpd");
}

export async function obtenerUrlDescargaDpdCliente(path: string): Promise<string> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado.");
  if (!path.startsWith(`${profile.id}/`)) throw new Error("Acceso no autorizado.");

  const supabase = createClient();
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function obtenerUrlDescargaActaCliente(path: string): Promise<string> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado.");
  if (!path.startsWith(`${profile.id}/`)) throw new Error("Acceso no autorizado.");

  const supabase = createClient();
  const { data, error } = await supabase.storage.from("actas-dpd").createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
