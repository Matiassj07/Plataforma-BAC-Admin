"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";

export interface ActaEntrega {
  id: string;
  profile_id: string;
  estado_implementacion: string;
  url_acta: string | null;
  url_acta_firmada: string | null;
  enviada_cliente: boolean;
  completada: boolean;
  created_at: string;
  updated_at: string;
}

export async function obtenerActaEntrega(clienteId: string): Promise<ActaEntrega | null> {
  await requireStaff();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("actas_entrega")
    .select("*")
    .eq("profile_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as ActaEntrega | null;
}

export async function subirActaEntrega(clienteId: string, formData: FormData) {
  await requireStaff();
  const file = formData.get("file") as File;
  if (!file) throw new Error("No se proporcionó archivo.");

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `actas-entrega/${clienteId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
  if (upErr) throw new Error(upErr.message);

  const { data: existing } = await supabase
    .from("actas_entrega")
    .select("id, url_acta_firmada, estado_implementacion")
    .eq("profile_id", clienteId)
    .maybeSingle();

  const completada = !!(existing?.url_acta_firmada) && (existing?.estado_implementacion !== "activa");

  if (existing) {
    const { error: dbErr } = await supabase
      .from("actas_entrega")
      .update({ url_acta: path, completada, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (dbErr) throw new Error(dbErr.message);
  } else {
    const { error: dbErr } = await supabase.from("actas_entrega").insert({
      profile_id: clienteId,
      url_acta: path,
    });
    if (dbErr) throw new Error(dbErr.message);
  }

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "Acta de entrega subida",
    modulo: "Documentos",
  });

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function subirActaFirmada(clienteId: string, formData: FormData) {
  await requireStaff();
  const file = formData.get("file") as File;
  if (!file) throw new Error("No se proporcionó archivo.");

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `actas-entrega/${clienteId}/firmada-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
  if (upErr) throw new Error(upErr.message);

  const { data: existing } = await supabase
    .from("actas_entrega")
    .select("id, url_acta, estado_implementacion")
    .eq("profile_id", clienteId)
    .maybeSingle();

  if (existing) {
    const completada = !!(existing.url_acta) && existing.estado_implementacion !== "activa";
    const { error: dbErr } = await supabase
      .from("actas_entrega")
      .update({ url_acta_firmada: path, completada, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (dbErr) throw new Error(dbErr.message);
  }

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "Acta de entrega firmada subida",
    modulo: "Documentos",
  });

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function actualizarEstadoImplementacion(
  clienteId: string,
  estado: string
) {
  await requireStaff();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("actas_entrega")
    .select("id, url_acta, url_acta_firmada")
    .eq("profile_id", clienteId)
    .maybeSingle();

  const completada = estado !== "activa";

  if (existing) {
    const { error: dbErr } = await supabase
      .from("actas_entrega")
      .update({
        estado_implementacion: estado,
        completada,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (dbErr) throw new Error(dbErr.message);
  } else {
    const { error: dbErr } = await supabase.from("actas_entrega").insert({
      profile_id: clienteId,
      estado_implementacion: estado,
      completada,
    });
    if (dbErr) throw new Error(dbErr.message);
  }

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: `Estado de implementación actualizado a "${estado}"`,
    modulo: "Documentos",
  });

  if (completada) {
    const { avanzarFlujoAutomatico } = await import("@/lib/admin/flujo-actions");
    await avanzarFlujoAutomatico(clienteId, "docs_completos", "Acta de entrega completada — avance automático a docs_completos");
  }

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function enviarActaACliente(clienteId: string) {
  const admin = await requireStaff();
  const supabase = createAdminClient();

  await supabase
    .from("actas_entrega")
    .update({ enviada_cliente: true, updated_at: new Date().toISOString() })
    .eq("profile_id", clienteId);

  await supabase.from("notificaciones_cliente").insert({
    profile_id: clienteId,
    tipo: "acta",
    titulo: "Acta de entrega disponible",
    descripcion: "Tu acta de entrega está lista para descargar y firmar.",
    modulo: "Documentos",
  });

  const { error: notaErr } = await supabase.from("notas_internas").insert({
    profile_id: clienteId,
    admin_id: admin.id,
    contenido: "Tu acta de entrega está lista para descargar y firmar. Ve a la sección Documentos para revisarla.",
    visible_cliente: true,
  });
  if (notaErr) console.error("Error inserting nota:", notaErr.message);

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: "Acta de entrega enviada al cliente",
    modulo: "Documentos",
  });

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarActaEntrega(clienteId: string) {
  await requireStaff();
  const supabase = createAdminClient();

  await supabase
    .from("actas_entrega")
    .delete()
    .eq("profile_id", clienteId);

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function obtenerUrlDescargaActa(path: string): Promise<string> {
  await requireStaff();
  const supabase = createAdminClient();
  const { data } = await supabase.storage
    .from("documentos")
    .createSignedUrl(path, 60);
  if (!data?.signedUrl) throw new Error("No se pudo generar URL de descarga.");
  return data.signedUrl;
}
