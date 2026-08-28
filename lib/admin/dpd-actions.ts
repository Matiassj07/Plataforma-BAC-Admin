"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { generarActaPdfBuffer } from "./dpd-acta-pdf";
import { MESES } from "./dpd-types";
import { sincronizarArchivoSiActivo } from "./almacenamiento-actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"];

function validarArchivoDpd(file: File): string {
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo no puede superar los 10 MB.");
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    throw new Error("Tipo de archivo no permitido. Usa PDF, DOC, DOCX, XLS, XLSX, TXT o CSV.");
  }
  return ext;
}

async function registrarHistorial(profileId: string, accion: string, modulo: string) {
  const supabase = createAdminClient();
  await supabase.from("historial_acciones").insert({ profile_id: profileId, accion, modulo });
}

export interface DatosPlanDpd {
  nombre_dpd: string;
  correo_dpd: string;
  periodo_inicio: string;
  periodo_fin: string;
}

export async function crearPlanDpd(profileId: string, datos: DatosPlanDpd, formData?: FormData) {
  const admin = await requireAdmin();
  if (!datos.nombre_dpd.trim() || !datos.correo_dpd.trim() || !datos.periodo_inicio || !datos.periodo_fin) {
    throw new Error("Completa nombre, correo y período del DPD.");
  }

  const supabase = createAdminClient();
  let urlPlanAdjunto: string | null = null;

  const file = formData?.get("file") as File | null;
  if (file && file.size > 0) {
    const ext = validarArchivoDpd(file);
    const path = `${profileId}/dpd-plan-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    urlPlanAdjunto = path;
    sincronizarArchivoSiActivo(profileId, file.name, path).catch((e) => console.error("[sync]", e));
  }

  const { data: plan, error } = await supabase
    .from("dpd_planes")
    .insert({
      profile_id: profileId,
      creado_por: admin.id,
      periodo_inicio: datos.periodo_inicio,
      periodo_fin: datos.periodo_fin,
      nombre_dpd: datos.nombre_dpd.trim(),
      correo_dpd: datos.correo_dpd.trim(),
      url_plan_adjunto: urlPlanAdjunto,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await registrarHistorial(profileId, "Plan DPD creado (por administrador)", "DPD");
  const { avanzarFlujoAutomatico } = await import("@/lib/admin/flujo-actions");
  await avanzarFlujoAutomatico(profileId, "dpd_completado", "Plan DPD creado — avance automático a dpd_completado");
  revalidatePath(`/admin/clientes/${profileId}`);
  return plan.id as string;
}

export async function editarPlanDpd(planId: string, profileId: string, datos: DatosPlanDpd) {
  await requireAdmin();
  if (!datos.nombre_dpd.trim() || !datos.correo_dpd.trim() || !datos.periodo_inicio || !datos.periodo_fin) {
    throw new Error("Completa nombre, correo y período del DPD.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dpd_planes")
    .update({
      periodo_inicio: datos.periodo_inicio,
      periodo_fin: datos.periodo_fin,
      nombre_dpd: datos.nombre_dpd.trim(),
      correo_dpd: datos.correo_dpd.trim(),
    })
    .eq("id", planId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clientes/${profileId}`);
}

export interface DatosActividadDpd {
  mes: number;
  fase: string;
  descripcion: string;
  verificacion: string;
}

export async function crearActividadDpd(planId: string, profileId: string, datos: DatosActividadDpd) {
  await requireAdmin();
  if (!datos.fase.trim() || !datos.descripcion.trim()) {
    throw new Error("Completa la fase y la descripción de la actividad.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("dpd_actividades").insert({
    plan_id: planId,
    mes: datos.mes,
    fase: datos.fase.trim(),
    descripcion: datos.descripcion.trim(),
    verificacion: datos.verificacion.trim() || null,
  });
  if (error) throw new Error(error.message);

  await registrarHistorial(profileId, "Actividad DPD añadida (por administrador)", "DPD");
  revalidatePath(`/admin/clientes/${profileId}`);
}

export async function marcarActividadCompletada(
  actividadId: string,
  profileId: string,
  datos: { fecha_completado: string; observaciones: string },
  formData?: FormData
) {
  await requireAdmin();
  const supabase = createAdminClient();

  let urlInforme: string | null = null;
  const file = formData?.get("file") as File | null;
  if (file && file.size > 0) {
    const ext = validarArchivoDpd(file);
    const path = `${profileId}/dpd-informe-${actividadId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
    if (uploadError) throw new Error(uploadError.message);
    urlInforme = path;
    sincronizarArchivoSiActivo(profileId, file.name, path).catch((e) => console.error("[sync]", e));
  }

  const { error } = await supabase
    .from("dpd_actividades")
    .update({
      completada: true,
      fecha_completado: new Date(datos.fecha_completado).toISOString(),
      observaciones: datos.observaciones.trim() || null,
      ...(urlInforme ? { url_informe: urlInforme } : {}),
    })
    .eq("id", actividadId);
  if (error) throw new Error(error.message);

  await registrarHistorial(profileId, "Actividad DPD marcada como completada", "DPD");
  revalidatePath(`/admin/clientes/${profileId}`);
}

export async function subirInformeActividad(actividadId: string, profileId: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivoDpd(file);

  const supabase = createAdminClient();
  const path = `${profileId}/dpd-informe-${actividadId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);
  sincronizarArchivoSiActivo(profileId, file.name, path).catch((e) => console.error("[sync]", e));

  const { error } = await supabase
    .from("dpd_actividades")
    .update({ url_informe: path })
    .eq("id", actividadId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/clientes/${profileId}`);
}

export interface DatosActaDpd {
  actividad_id: string | null;
  descripcion_hallazgo: string;
  recomendacion: string;
}

export async function crearActaDpd(planId: string, profileId: string, datos: DatosActaDpd) {
  await requireAdmin();
  if (!datos.descripcion_hallazgo.trim() || !datos.recomendacion.trim()) {
    throw new Error("Completa el hallazgo y la recomendación.");
  }

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("dpd_actas")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId);

  const numeroActa = `Acta No. ${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: acta, error } = await supabase
    .from("dpd_actas")
    .insert({
      plan_id: planId,
      actividad_id: datos.actividad_id,
      numero_acta: numeroActa,
      descripcion_hallazgo: datos.descripcion_hallazgo.trim(),
      recomendacion: datos.recomendacion.trim(),
      estado: "pendiente_firma",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await registrarHistorial(profileId, `${numeroActa} creada (por administrador)`, "DPD");
  revalidatePath(`/admin/clientes/${profileId}`);

  try {
    await generarYGuardarActaPdf(acta.id, planId, profileId, numeroActa, datos);
  } catch {
    // PDF generation is non-critical; acta was already persisted
  }

  try {
    await registrarEnvioActa(profileId, numeroActa);
  } catch {
    // Email notification is non-critical; acta was already persisted
  }

  revalidatePath(`/admin/clientes/${profileId}`);

  return acta.id as string;
}

/**
 * Registra el envío de la notificación de un acta al cliente en el historial de
 * correos, usando el proveedor de correo configurado. Si no hay proveedor
 * activo, queda registrada como "error" para que el admin lo vea. Compartida
 * por la creación automática y el reenvío manual.
 */
async function registrarEnvioActa(profileId: string, numeroActa: string) {
  const supabase = createAdminClient();

  const { data: proveedorActivo } = await supabase
    .from("config_correo")
    .select("id")
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  const estado = proveedorActivo ? "enviado" : "error";
  const { error } = await supabase.from("historial_correos").insert({
    destinatario_id: profileId,
    asunto: `${numeroActa} — Requiere tu firma`,
    tipo: "acta-dpd",
    estado,
    error_detalle: proveedorActivo
      ? null
      : "No hay proveedor de correo configurado (ver /admin/correos)",
  });
  if (error) throw new Error(error.message);

  return { estado };
}

async function generarYGuardarActaPdf(
  actaId: string,
  planId: string,
  profileId: string,
  numeroActa: string,
  datos: DatosActaDpd
) {
  const supabase = createAdminClient();

  const [{ data: plan }, { data: perfil }, { data: actividad }] = await Promise.all([
    supabase.from("dpd_planes").select("nombre_dpd, correo_dpd").eq("id", planId).single(),
    supabase.from("profiles").select("nombre_empresa, ruc, direccion").eq("id", profileId).single(),
    datos.actividad_id
      ? supabase.from("dpd_actividades").select("mes, fase, descripcion").eq("id", datos.actividad_id).single()
      : Promise.resolve({ data: null }),
  ]);

  if (!plan || !perfil) throw new Error("No se encontraron los datos del plan o del cliente.");

  const buffer = await generarActaPdfBuffer({
    numeroActa,
    fechaCreacion: (() => {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    })(),
    empresa: { nombre: perfil.nombre_empresa, ruc: perfil.ruc, direccion: perfil.direccion },
    dpd: { nombre: plan.nombre_dpd, correo: plan.correo_dpd },
    actividad: actividad
      ? { mes: MESES[actividad.mes - 1], fase: actividad.fase, descripcion: actividad.descripcion }
      : null,
    hallazgo: datos.descripcion_hallazgo.trim(),
    recomendacion: datos.recomendacion.trim(),
  });

  const path = `${profileId}/${actaId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("actas-dpd")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await supabase
    .from("dpd_actas")
    .update({ url_acta_generada: path })
    .eq("id", actaId);
  if (updateError) throw new Error(updateError.message);
}

export async function subirActaFirmadaAdmin(actaId: string, profileId: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivoDpd(file);

  const supabase = createAdminClient();
  const path = `${profileId}/actas/${actaId}_firmada.${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(path, buffer, { upsert: true, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase
    .from("dpd_actas")
    .update({ url_acta_firmada: path, estado: "firmada" })
    .eq("id", actaId);
  if (error) throw new Error(error.message);

  await registrarHistorial(profileId, "Acta firmada subida (por administrador)", "DPD");
  revalidatePath(`/admin/clientes/${profileId}`);
}

export async function enviarActaAlCliente(actaId: string, profileId: string, numeroActa: string) {
  await requireAdmin();
  const { estado } = await registrarEnvioActa(profileId, numeroActa);
  revalidatePath(`/admin/clientes/${profileId}`);
  return { estado };
}

export async function obtenerUrlDescargaDpd(profileId: string, path: string): Promise<string> {
  await requireAdmin();
  if (!path.startsWith(`${profileId}/`)) throw new Error("Ruta de archivo inválida.");
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function obtenerUrlDescargaActa(profileId: string, path: string): Promise<string> {
  await requireAdmin();
  if (!path.startsWith(`${profileId}/`)) throw new Error("Ruta de archivo inválida.");
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("actas-dpd").createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function crearInformeBrecha(
  planId: string,
  clienteId: string,
  datos: {
    mes: string;
    anio: number;
    hubo_brecha: boolean;
    contenido: string;
  }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("dpd_informes_brechas").insert({
    plan_id: planId,
    mes: datos.mes,
    anio: datos.anio,
    hubo_brecha: datos.hubo_brecha,
    contenido: datos.contenido,
  });
  if (error) throw new Error(error.message);

  if (datos.hubo_brecha) {
    await supabase.from("brechas_seguridad").insert({
      profile_id: clienteId,
      tipo_incidente: `Brecha detectada — ${datos.mes} ${datos.anio}`,
      descripcion: datos.contenido,
      fecha_deteccion: new Date().toISOString().slice(0, 10),
      estado: "abierta",
    });
  }

  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function editarInformeBrecha(
  informeId: string,
  clienteId: string,
  datos: { mes: string; anio: number; hubo_brecha: boolean; contenido: string }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dpd_informes_brechas")
    .update({
      mes: datos.mes,
      anio: datos.anio,
      hubo_brecha: datos.hubo_brecha,
      contenido: datos.contenido,
    })
    .eq("id", informeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarInformeBrecha(informeId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: informe } = await supabase
    .from("dpd_informes_brechas")
    .select("mes, anio, hubo_brecha")
    .eq("id", informeId)
    .single();
  const { error } = await supabase.from("dpd_informes_brechas").delete().eq("id", informeId);
  if (error) throw new Error(error.message);
  if (informe?.hubo_brecha) {
    await supabase
      .from("brechas_seguridad")
      .delete()
      .eq("profile_id", clienteId)
      .eq("tipo_incidente", `Brecha detectada — ${informe.mes} ${informe.anio}`);
  }
  revalidatePath(`/admin/clientes/${clienteId}`);
}
