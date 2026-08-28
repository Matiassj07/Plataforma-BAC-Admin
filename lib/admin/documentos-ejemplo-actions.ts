"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "ppt", "pptx"];

function validarArchivoEjemplo(file: File): string {
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo no puede superar los 10 MB.");
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    throw new Error("Tipo de archivo no permitido.");
  }
  return ext;
}

export async function subirDocumentoEjemplo(slug: string, nombreDocumento: string, formData: FormData) {
  const admin = await requireStaff();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivoEjemplo(file);

  const supabase = createAdminClient();
  const path = `${slug}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("ejemplos-documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("documentos_ejemplo").upsert(
    {
      slug,
      nombre_archivo: file.name,
      url_storage: path,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    },
    { onConflict: "slug" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/documentos-ejemplo");
}

export async function eliminarDocumentoEjemplo(slug: string) {
  await requireStaff();
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("documentos_ejemplo")
    .select("url_storage")
    .eq("slug", slug)
    .single();
  if (!doc) throw new Error("Documento ejemplo no encontrado");

  if (doc.url_storage) {
    await supabase.storage.from("ejemplos-documentos").remove([doc.url_storage]);
  }

  const { error } = await supabase
    .from("documentos_ejemplo")
    .delete()
    .eq("slug", slug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos-ejemplo");
}

export async function obtenerUrlDescargaEjemplo(path: string): Promise<string> {
  await requireStaff();
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("ejemplos-documentos").createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function crearCarpetaEjemplo(nombre: string, carpetaPadreId?: string) {
  await requireStaff();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("insert_carpeta_ejemplo", {
    p_nombre: nombre.trim(),
    ...(carpetaPadreId ? { p_carpeta_padre_id: carpetaPadreId } : {}),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos-ejemplo");
  return data as string;
}

export async function eliminarCarpetaEjemplo(carpetaId: string) {
  await requireStaff();
  const supabase = createAdminClient();

  const { data: docs } = await supabase.rpc("select_docs_ejemplo_por_carpeta", { p_carpeta_id: carpetaId });
  if (docs && docs.length > 0) {
    const paths = (docs as any[]).map((d) => d.url_storage).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from("ejemplos-documentos").remove(paths);
    }
  }

  const { error } = await supabase.rpc("delete_carpeta_ejemplo", { p_carpeta_id: carpetaId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos-ejemplo");
}

export async function subirDocEnCarpetaEjemplo(carpetaId: string, formData: FormData) {
  await requireStaff();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivoEjemplo(file);

  const supabase = createAdminClient();
  const slug = `carpeta-${carpetaId}-${Date.now()}`;
  const path = `carpetas/${carpetaId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("ejemplos-documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const nombrePersonalizado = (formData.get("nombreArchivo") as string | null)?.trim();
  const nombreFinal = nombrePersonalizado || file.name;

  const { error } = await supabase.from("documentos_ejemplo").insert({
    slug,
    nombre_archivo: nombreFinal,
    url_storage: path,
    updated_at: new Date().toISOString(),
    carpeta_ejemplo_id: carpetaId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos-ejemplo");
}

export async function renombrarDocEjemplo(docSlug: string, nuevoNombre: string) {
  await requireStaff();
  const nombre = nuevoNombre.trim();
  if (!nombre) throw new Error("El nombre no puede estar vacío.");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("documentos_ejemplo")
    .update({ nombre_archivo: nombre })
    .eq("slug", docSlug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos-ejemplo");
}

export async function eliminarDocDeCarpetaEjemplo(docSlug: string) {
  await requireStaff();
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("documentos_ejemplo")
    .select("url_storage")
    .eq("slug", docSlug)
    .single();
  if (!doc) throw new Error("Documento no encontrado.");

  if (doc.url_storage) {
    await supabase.storage.from("ejemplos-documentos").remove([doc.url_storage]);
  }
  const { error } = await supabase.from("documentos_ejemplo").delete().eq("slug", docSlug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/documentos-ejemplo");
}
