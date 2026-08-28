"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { sincronizarArchivoSiActivo } from "./almacenamiento-actions";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"];

function validarArchivo(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo no puede superar los 10 MB.");
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    throw new Error("Tipo de archivo no permitido. Usa PDF, DOC, DOCX, XLS, XLSX, TXT o CSV.");
  }
  return ext;
}

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

export async function obtenerUrlDescarga(clienteId: string, path: string): Promise<string> {
  await requireAdmin();
  if (!path.startsWith(`${clienteId}/`)) {
    throw new Error("Acceso no autorizado al archivo.");
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function descargarDocRat(clienteId: string, urlStorage: string, _nombreArchivo: string): Promise<string> {
  await requireAdmin();
  if (!urlStorage.startsWith(`${clienteId}/`)) throw new Error("Acceso no autorizado al archivo.");
  const supabase = createAdminClient();

  const { data: directUrl } = await supabase.storage.from("documentos").createSignedUrl(urlStorage, 120);

  const fileName = urlStorage.split("/").pop();
  if (!fileName) {
    if (directUrl?.signedUrl) return directUrl.signedUrl;
    throw new Error("Archivo no encontrado.");
  }

  const { data: folders } = await supabase.storage.from("documentos").list(`${clienteId}/rat`, { limit: 100 });
  if (folders) {
    for (const folder of folders) {
      if (folder.name === ".emptyFolderPlaceholder") continue;
      const { data: files } = await supabase.storage.from("documentos").list(`${clienteId}/rat/${folder.name}`, { limit: 100 });
      if (!files) continue;
      const realFiles = files.filter((f) => f.name !== ".emptyFolderPlaceholder");
      const match = realFiles.find((f) => f.name === fileName);
      if (match) {
        const foundPath = `${clienteId}/rat/${folder.name}/${fileName}`;
        const { data: url } = await supabase.storage.from("documentos").createSignedUrl(foundPath, 120);
        if (url?.signedUrl) return url.signedUrl;
      }
      const ext = fileName.split(".").pop();
      const latest = realFiles
        .filter((f) => f.name.endsWith(`.${ext}`))
        .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
        [0];
      if (latest) {
        const foundPath = `${clienteId}/rat/${folder.name}/${latest.name}`;
        const { data: url } = await supabase.storage.from("documentos").createSignedUrl(foundPath, 120);
        if (url?.signedUrl) return url.signedUrl;
      }
    }
  }

  if (directUrl?.signedUrl) return directUrl.signedUrl;
  throw new Error("Archivo no encontrado en almacenamiento.");
}

export async function subirDocEnCarpetaClientePorNombre(
  clienteId: string,
  nombreCarpeta: string,
  formData: FormData
) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivo(file);

  const supabase = createAdminClient();

  let { data: carpeta } = await supabase
    .from("carpetas_documentos")
    .select("id")
    .eq("profile_id", clienteId)
    .eq("nombre", nombreCarpeta)
    .maybeSingle();

  if (!carpeta) {
    const { data: nueva, error: createErr } = await supabase
      .from("carpetas_documentos")
      .insert({ profile_id: clienteId, nombre: nombreCarpeta })
      .select("id")
      .single();
    if (createErr) throw new Error(createErr.message);
    carpeta = nueva;
  }

  const path = `${clienteId}/carpetas/${carpeta.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const nombrePersonalizado = (formData.get("nombreArchivo") as string | null)?.trim();
  const nombreFinal = nombrePersonalizado || file.name;

  const { data: doc, error } = await supabase
    .from("documentos_carpeta")
    .insert({
      carpeta_id: carpeta.id,
      nombre_archivo: nombreFinal,
      url_storage: path,
      subido_por: clienteId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await registrarHistorial(clienteId, `Subió "${nombreFinal}" (por administrador)`, "Documentos");
  await notificarCliente(clienteId, "documento", "Documento subido", `Se subió "${nombreFinal}" (por administrador)`, "Documentos");
  sincronizarArchivoSiActivo(clienteId, nombreFinal, path).catch((e) => console.error("[sync]", e));
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { docId: doc.id as string };
}

export interface DatosEmpleado {
  nombre: string;
  cargo: string | null;
  area: string | null;
  fecha_firma: string | null;
  fecha_renovacion: string | null;
  email?: string;
  password?: string;
  rol?: "contador" | "asistente" | "cliente";
}

function normalizarDatosEmpleado(datos: DatosEmpleado) {
  return {
    nombre: datos.nombre,
    cargo: datos.cargo,
    area: datos.area,
    fecha_firma: datos.fecha_firma || null,
    fecha_renovacion: datos.fecha_renovacion || null,
  };
}

export async function crearEmpleado(clienteId: string, datos: DatosEmpleado) {
  await requireAdmin();

  if (!datos.email || !datos.password) {
    throw new Error("Email y contraseña son obligatorios para crear un empleado.");
  }

  const admin = createAdminClient();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: true,
    user_metadata: { is_personal: true },
  });
  if (authError) throw new Error(authError.message);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("personal")
    .insert({
      profile_id: clienteId,
      ...normalizarDatosEmpleado(datos),
      email: datos.email,
      auth_user_id: authUser.user.id,
      rol: datos.rol ?? "cliente",
    });

  if (error) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(error.message);
  }

  await registrarHistorial(clienteId, `Añadió a ${datos.nombre} (por administrador)`, "Personal");
  await notificarCliente(clienteId, "personal", "Empleado añadido", `Se añadió a ${datos.nombre}`, "Personal");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { email: datos.email };
}

export async function actualizarEmpleado(empleadoId: string, clienteId: string, datos: DatosEmpleado) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("personal")
    .select("auth_user_id")
    .eq("id", empleadoId)
    .single();

  if (datos.password && existing?.auth_user_id) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(existing.auth_user_id, {
      password: datos.password,
    });
  }

  const { error } = await supabase
    .from("personal")
    .update({
      ...normalizarDatosEmpleado(datos),
      rol: datos.rol ?? "cliente",
    })
    .eq("id", empleadoId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "personal", "Empleado actualizado", `Se actualizó información de ${datos.nombre}`, "Personal");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarEmpleado(empleadoId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("personal")
    .select("auth_user_id, nombre")
    .eq("id", empleadoId)
    .single();

  if (existing?.auth_user_id) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(existing.auth_user_id);
  }

  const { error } = await supabase
    .from("personal")
    .delete()
    .eq("id", empleadoId);
  if (error) throw new Error(error.message);

  await registrarHistorial(clienteId, `Eliminó a ${existing?.nombre ?? "empleado"} (por administrador)`, "Personal");
  await notificarCliente(clienteId, "personal", "Empleado eliminado", `Se eliminó a ${existing?.nombre ?? "empleado"}`, "Personal");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function crearNotaInterna(clienteId: string, contenido: string, visibleCliente: boolean) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notas_internas")
    .insert({ profile_id: clienteId, admin_id: admin.id, contenido, visible_cliente: visibleCliente });
  if (error) throw new Error(error.message);
  if (visibleCliente) {
    await notificarCliente(clienteId, "nota", "Nueva nota", "Se añadió una nota visible para usted", "Notas");
  }
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function actualizarVisibilidadNota(notaId: string, clienteId: string, visible: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notas_internas")
    .update({ visible_cliente: visible })
    .eq("id", notaId);
  if (error) throw new Error(error.message);
  if (visible) {
    await notificarCliente(clienteId, "nota", "Nota compartida", "Una nota interna fue compartida con usted", "Notas");
  }
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export interface DatosResponsableInput {
  responsable: string;
  ruc: string;
  direccion: string;
  encargado: string;
  telefono?: string;
  web?: string;
}

export interface DatosDpdInput {
  nombre: string;
  direccion: string;
  correo: string;
}

export interface ActividadRatInput {
  nombre_actividad: string;
  finalidad: string;
  categoria_datos: string[];
  categorias_especiales: string;
  categorias_titulares: string[];
  perfiles_automatizados: boolean;
  base_licitud: string;
  plazo_conservacion: string;
  destinatarios: string;
  transferencias_internacionales: boolean;
  medidas_seguridad: string;
  departamento: string | null;
  origen_datos: string | null;
  articulo_lopdp: string | null;
  almacenamiento: string | null;
  activo_informacion: string | null;
}

export async function crearRatCompleto(
  clienteId: string,
  datosResponsable: DatosResponsableInput,
  datosDpd: DatosDpdInput,
  actividades: ActividadRatInput[]
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: ultima } = await supabase
    .from("rat_versiones")
    .select("version")
    .eq("profile_id", clienteId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: version, error } = await supabase
    .from("rat_versiones")
    .insert({
      profile_id: clienteId,
      version: (ultima?.version ?? 0) + 1,
      datos_responsable: datosResponsable,
      datos_dpd: datosDpd,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: actData, error: actError } = await supabase
    .from("actividades_rat")
    .insert(actividades.map((a) => ({ ...a, rat_version_id: version.id })))
    .select("id");
  if (actError) throw new Error(actError.message);

  await registrarHistorial(clienteId, "Nueva versión de RAT creada (por administrador)", "RAT");
  await notificarCliente(clienteId, "rat", "RAT actualizado", "Se creó una nueva versión del RAT", "RAT");
  const { avanzarFlujoAutomatico } = await import("@/lib/admin/flujo-actions");
  await avanzarFlujoAutomatico(clienteId, "rat_completado", "RAT creado — avance automático a rat_completado");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { versionId: version.id, actividadIds: (actData ?? []).map((a) => a.id) };
}

export async function subirArchivoFuente(
  clienteId: string,
  tipo: "rat" | "matriz",
  formData: FormData
) {
  await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivo(file);

  const supabase = createAdminClient();
  const path = `${clienteId}/fuente-${tipo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("documentos").upload(path, file);
  if (error) throw new Error(error.message);

  await registrarHistorial(
    clienteId,
    `Subió archivo "${file.name}" como fuente de ${tipo === "rat" ? "RAT" : "matriz de riesgos"} (por administrador)`,
    tipo === "rat" ? "RAT" : "Riesgos"
  );
  await notificarCliente(clienteId, "documento", "Archivo fuente subido", `Se subió archivo fuente de ${tipo === "rat" ? "RAT" : "matriz de riesgos"}`, tipo === "rat" ? "RAT" : "Riesgos");
  sincronizarArchivoSiActivo(clienteId, file.name, path).catch((e) => console.error("[sync]", e));
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export interface RiesgoInput {
  actividad_rat_id: string | null;
  area_departamento: string | null;
  actividad_tratamiento: string | null;
  cat_especiales_gran_escala: boolean;
  obs_sistematica_publica: boolean;
  trat_automatizado: boolean;
  activos_relacionados: string | null;
  base_legal: string | null;
  articulo_ley: string | null;
  codigo: string;
  amenazas: string;
  vulnerabilidades: string;
  medidas_implementadas: string | null;
  probabilidad: number;
  impacto: number;
  nivel_riesgo: string;
  requiere_eipd: boolean;
  medidas_implementar: string;
  prob_residual: number;
  imp_residual: number;
  nivel_riesgo_residual: string;
  responsable_implementacion: string | null;
  semaforo: "rojo" | "amarillo" | "verde";
}

export async function crearMatrizCompleta(clienteId: string, riesgos: RiesgoInput[]) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: ultima } = await supabase
    .from("matriz_riesgos")
    .select("version")
    .eq("profile_id", clienteId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: matriz, error } = await supabase
    .from("matriz_riesgos")
    .insert({ profile_id: clienteId, version: (ultima?.version ?? 0) + 1 })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { data: inserted, error: riesgosError } = await supabase
    .from("actividades_riesgo")
    .insert(riesgos.map((r) => ({ ...r, matriz_id: matriz.id })))
    .select("id");
  if (riesgosError) throw new Error(riesgosError.message);

  await registrarHistorial(
    clienteId,
    "Nueva versión de matriz de riesgos creada (por administrador)",
    "Riesgos"
  );
  await notificarCliente(clienteId, "riesgos", "Matriz de riesgos creada", "Se creó una nueva matriz de riesgos", "Riesgos");
  const { avanzarFlujoAutomatico } = await import("@/lib/admin/flujo-actions");
  await avanzarFlujoAutomatico(clienteId, "riesgos_completados", "Matriz de riesgos creada — avance automático a riesgos_completados");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { matrizId: matriz.id, actividadIds: (inserted ?? []).map((r: any) => r.id as string) };
}

export async function cambiarEstadoBrecha(
  brechaId: string,
  clienteId: string,
  nuevoEstado: "abierta" | "contenida" | "cerrada"
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("brechas_seguridad")
    .update({ estado: nuevoEstado })
    .eq("id", brechaId);
  if (error) throw new Error(error.message);

  const labels: Record<string, string> = {
    abierta: "reabierta",
    contenida: "marcada como contenida",
    cerrada: "cerrada",
  };
  await registrarHistorial(clienteId, `Brecha ${labels[nuevoEstado]} (por administrador)`, "Brechas");
  await notificarCliente(clienteId, "brecha", "Estado de brecha actualizado", `La brecha fue ${labels[nuevoEstado]}`, "Brechas");
  revalidatePath(`/admin/clientes/${clienteId}`);
}


export async function crearBrechaAdmin(
  clienteId: string,
  data: { tipo_incidente: string; descripcion: string; datos_afectados?: string; fecha_deteccion: string }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("brechas_seguridad").insert({
    profile_id: clienteId,
    tipo_incidente: data.tipo_incidente,
    descripcion: data.descripcion,
    datos_afectados: data.datos_afectados || null,
    fecha_deteccion: data.fecha_deteccion,
    estado: "abierta",
  });
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, "Brecha creada (por administrador)", "Brechas");
  await notificarCliente(clienteId, "brecha", "Nueva brecha registrada", "Se registró una nueva brecha de seguridad", "Brechas");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarDocumentoCliente(docId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("documentos_generales")
    .select("url_storage, tipo_documento")
    .eq("id", docId)
    .eq("profile_id", clienteId)
    .single();
  if (!doc) throw new Error("Documento no encontrado");

  if (doc.url_storage) {
    await supabase.storage.from("documentos").remove([doc.url_storage]);
  }

  const { error } = await supabase
    .from("documentos_generales")
    .delete()
    .eq("id", docId);
  if (error) throw new Error(error.message);

  await registrarHistorial(clienteId, `Eliminó documento ${doc.tipo_documento} (por administrador)`, "Documentos");
  await notificarCliente(clienteId, "documento", "Documento eliminado", `Se eliminó un documento (${doc.tipo_documento})`, "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

async function registrarHistorial(profileId: string, accion: string, modulo: string) {
  const supabase = createAdminClient();
  await supabase.from("historial_acciones").insert({ profile_id: profileId, accion, modulo });
}

// ── Edición in-place de RAT ──

const CAMPOS_RAT_PERMITIDOS = new Set([
  "departamento", "nombre_actividad", "finalidad", "categoria_datos",
  "categorias_especiales", "perfiles_automatizados", "categorias_titulares",
  "origen_datos", "base_licitud", "articulo_lopdp", "almacenamiento",
  "plazo_conservacion", "destinatarios", "transferencias_internacionales",
  "medidas_seguridad", "activo_informacion",
]);

export async function actualizarActividadRat(
  actividadId: string,
  clienteId: string,
  campo: string,
  valor: unknown
) {
  await requireAdmin();
  if (!CAMPOS_RAT_PERMITIDOS.has(campo)) throw new Error("Campo no permitido");
  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from("actividades_rat")
    .select(campo)
    .eq("id", actividadId)
    .single();
  const valorAnterior = current ? String((current as any)[campo] ?? "") : "";
  const valorNuevo = String(valor ?? "");

  if (valorAnterior !== valorNuevo) {
    const { data: cambios } = await supabase
      .from("rat_cambios_campo")
      .select("id, version_cambio")
      .eq("actividad_rat_id", actividadId)
      .eq("campo", campo)
      .order("version_cambio", { ascending: true });

    const lista = cambios ?? [];
    if (lista.length >= 2) {
      await supabase.from("rat_cambios_campo").delete().eq("id", lista[0].id);
      await supabase
        .from("rat_cambios_campo")
        .update({ version_cambio: 1 })
        .eq("id", lista[1].id);
      await supabase.from("rat_cambios_campo").insert({
        actividad_rat_id: actividadId,
        campo,
        valor_anterior: valorAnterior,
        valor_nuevo: valorNuevo,
        version_cambio: 2,
      });
    } else {
      await supabase.from("rat_cambios_campo").insert({
        actividad_rat_id: actividadId,
        campo,
        valor_anterior: valorAnterior,
        valor_nuevo: valorNuevo,
        version_cambio: lista.length + 1,
      });
    }
  }

  const { error } = await supabase
    .from("actividades_rat")
    .update({ [campo]: valor })
    .eq("id", actividadId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "rat", "RAT actualizado", `Campo "${campo}" fue modificado`, "RAT");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function agregarActividadRat(
  versionId: string,
  clienteId: string,
  datos?: Record<string, string>
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const insertData: Record<string, unknown> = { rat_version_id: versionId };
  if (datos) {
    for (const [k, v] of Object.entries(datos)) {
      if (CAMPOS_RAT_PERMITIDOS.has(k) && v && typeof v === "string" && v.trim()) insertData[k] = v.trim();
    }
  }
  if (!insertData.nombre_actividad) insertData.nombre_actividad = "Nueva actividad";
  const { data: inserted, error } = await supabase.from("actividades_rat").insert(insertData).select("id").single();
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "rat", "Actividad RAT añadida", "Se añadió una nueva actividad al RAT", "RAT");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return inserted.id as string;
}

export async function eliminarActividadRat(actividadId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("actividades_rat")
    .delete()
    .eq("id", actividadId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "rat", "Actividad RAT eliminada", "Se eliminó una actividad del RAT", "RAT");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

// ── Edición in-place de Riesgos ──

const CAMPOS_RIESGO_PERMITIDOS = new Set([
  "area_departamento", "actividad_tratamiento", "cat_especiales_gran_escala",
  "obs_sistematica_publica", "trat_automatizado", "activos_relacionados",
  "base_legal", "articulo_ley", "amenazas", "vulnerabilidades",
  "medidas_implementadas", "probabilidad", "impacto", "requiere_eipd",
  "medidas_implementar", "prob_residual", "imp_residual",
  "responsable_implementacion",
]);

export async function actualizarActividadRiesgo(
  actividadId: string,
  clienteId: string,
  campo: string,
  valor: unknown
) {
  await requireAdmin();
  if (!CAMPOS_RIESGO_PERMITIDOS.has(campo)) throw new Error("Campo no permitido");
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { [campo]: valor };

  if (campo === "probabilidad" || campo === "impacto") {
    const { data: row } = await supabase
      .from("actividades_riesgo")
      .select("probabilidad, impacto")
      .eq("id", actividadId)
      .single();
    if (row) {
      const prob = campo === "probabilidad" ? Number(valor) : row.probabilidad;
      const imp = campo === "impacto" ? Number(valor) : row.impacto;
      if (prob && imp) {
        updates.riesgo_inherente = prob * imp;
        const r = prob * imp;
        updates.nivel_riesgo = r >= 20 ? "critico" : r >= 12 ? "alto" : r >= 6 ? "medio" : r >= 3 ? "bajo" : "muy_bajo";
      }
    }
  }

  if (campo === "prob_residual" || campo === "imp_residual") {
    const { data: row } = await supabase
      .from("actividades_riesgo")
      .select("prob_residual, imp_residual")
      .eq("id", actividadId)
      .single();
    if (row) {
      const prob = campo === "prob_residual" ? Number(valor) : row.prob_residual;
      const imp = campo === "imp_residual" ? Number(valor) : row.imp_residual;
      if (prob && imp) {
        updates.riesgo_residual = prob * imp;
        const r = prob * imp;
        updates.nivel_riesgo_residual = r >= 20 ? "critico" : r >= 12 ? "alto" : r >= 6 ? "medio" : r >= 3 ? "bajo" : "muy_bajo";
      }
    }
  }

  // Track per-field change history (FIFO, max 2 changes)
  const { data: current } = await supabase
    .from("actividades_riesgo")
    .select("*")
    .eq("id", actividadId)
    .single();
  const valorAnterior = current ? String((current as any)[campo] ?? "") : "";
  const valorNuevo = String(valor ?? "");
  if (valorAnterior !== valorNuevo) {
    const { data: cambios } = await supabase
      .from("riesgo_cambios_campo")
      .select("id, version_cambio")
      .eq("actividad_riesgo_id", actividadId)
      .eq("campo", campo)
      .order("version_cambio", { ascending: true });
    const lista = cambios ?? [];
    if (lista.length >= 2) {
      await supabase.from("riesgo_cambios_campo").delete().eq("id", lista[0].id);
      await supabase.from("riesgo_cambios_campo").update({ version_cambio: 1 }).eq("id", lista[1].id);
      await supabase.from("riesgo_cambios_campo").insert({
        actividad_riesgo_id: actividadId, campo, valor_anterior: valorAnterior, valor_nuevo: valorNuevo, version_cambio: 2,
      });
    } else {
      await supabase.from("riesgo_cambios_campo").insert({
        actividad_riesgo_id: actividadId, campo, valor_anterior: valorAnterior, valor_nuevo: valorNuevo, version_cambio: lista.length + 1,
      });
    }
  }

  const { error } = await supabase
    .from("actividades_riesgo")
    .update(updates)
    .eq("id", actividadId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "riesgos", "Riesgo actualizado", `Campo "${campo}" fue modificado`, "Riesgos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function agregarActividadRiesgo(
  matrizId: string,
  clienteId: string,
  datos?: Record<string, string>
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("actividades_riesgo")
    .select("id", { count: "exact", head: true })
    .eq("matriz_id", matrizId);
  const num = count ?? 0;
  const insertData: Record<string, unknown> = {
    matriz_id: matrizId,
    codigo: `RIES-${String(num + 1).padStart(2, "0")}`,
  };
  if (datos) {
    for (const [k, v] of Object.entries(datos)) {
      if (CAMPOS_RIESGO_PERMITIDOS.has(k) && v && typeof v === "string" && v.trim()) insertData[k] = v.trim();
    }
  }
  const { data: inserted, error } = await supabase.from("actividades_riesgo").insert(insertData).select("id").single();
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "riesgos", "Riesgo añadido", "Se añadió un nuevo riesgo a la matriz", "Riesgos");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return inserted.id as string;
}

export async function eliminarActividadRiesgo(actividadId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("actividades_riesgo")
    .delete()
    .eq("id", actividadId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "riesgos", "Riesgo eliminado", "Se eliminó un riesgo de la matriz", "Riesgos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

// ── Eliminación universal ──

export async function eliminarVersionRat(versionId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("actividades_rat").delete().eq("rat_version_id", versionId);
  const { error } = await supabase.from("rat_versiones").delete().eq("id", versionId);
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, "Eliminó versión de RAT (por administrador)", "RAT");
  await notificarCliente(clienteId, "rat", "Versión RAT eliminada", "Se eliminó una versión del RAT", "RAT");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarMatrizRiesgos(matrizId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("actividades_riesgo").delete().eq("matriz_id", matrizId);
  const { error } = await supabase.from("matriz_riesgos").delete().eq("id", matrizId);
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, "Eliminó matriz de riesgos (por administrador)", "Riesgos");
  await notificarCliente(clienteId, "riesgos", "Matriz de riesgos eliminada", "Se eliminó una matriz de riesgos", "Riesgos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function editarBrecha(
  brechaId: string,
  clienteId: string,
  data: { tipo_incidente: string; descripcion: string }
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("brechas_seguridad")
    .update({ tipo_incidente: data.tipo_incidente, descripcion: data.descripcion })
    .eq("id", brechaId);
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, "Brecha editada (por administrador)", "Brechas");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarBrecha(brechaId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: brecha } = await supabase
    .from("brechas_seguridad")
    .select("tipo_incidente")
    .eq("id", brechaId)
    .single();
  const { error } = await supabase.from("brechas_seguridad").delete().eq("id", brechaId);
  if (error) throw new Error(error.message);
  if (brecha?.tipo_incidente?.startsWith("Brecha detectada — ")) {
    const partes = brecha.tipo_incidente.replace("Brecha detectada — ", "").split(" ");
    const mes = partes[0];
    const anio = parseInt(partes[1]);
    if (mes && !isNaN(anio)) {
      await supabase
        .from("dpd_informes_brechas")
        .delete()
        .eq("mes", mes)
        .eq("anio", anio)
        .eq("hubo_brecha", true)
        .in("plan_id",
          (await supabase.from("dpd_planes").select("id").eq("profile_id", clienteId)).data?.map((p: any) => p.id) ?? []
        );
    }
  }
  await registrarHistorial(clienteId, "Eliminó brecha (por administrador)", "Brechas");
  await notificarCliente(clienteId, "brecha", "Brecha eliminada", "Se eliminó una brecha de seguridad", "Brechas");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function limpiarBrechasCerradasAntiguas(clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const hace5Dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("brechas_seguridad")
    .delete()
    .eq("profile_id", clienteId)
    .eq("estado", "cerrada")
    .lt("created_at", hace5Dias);
}

export async function eliminarNotaInterna(notaId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("notas_internas").delete().eq("id", notaId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "nota", "Nota eliminada", "Se eliminó una nota", "Notas");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarPlanDpd(planId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("dpd_actas").delete().eq("plan_id", planId);
  await supabase.from("dpd_actividades").delete().eq("plan_id", planId);
  const { error } = await supabase.from("dpd_planes").delete().eq("id", planId);
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, "Eliminó plan DPD (por administrador)", "DPD");
  await notificarCliente(clienteId, "dpd", "Plan DPD eliminado", "Se eliminó un plan DPD", "DPD");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarActividadDpd(actividadId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("dpd_actas").update({ actividad_id: null }).eq("actividad_id", actividadId);
  const { error } = await supabase.from("dpd_actividades").delete().eq("id", actividadId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "dpd", "Actividad DPD eliminada", "Se eliminó una actividad del plan DPD", "DPD");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarActaDpd(actaId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("dpd_actas").delete().eq("id", actaId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "dpd", "Acta DPD eliminada", "Se eliminó un acta del plan DPD", "DPD");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

// ── Carpetas de documentos ──

export async function crearCarpetaAdmin(clienteId: string, nombre: string, carpetaPadreId?: string) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("carpetas_documentos").insert({
    profile_id: clienteId,
    nombre,
    created_by: admin.id,
    ...(carpetaPadreId ? { carpeta_padre_id: carpetaPadreId } : {}),
  }).select("id").single();
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, `Creó carpeta "${nombre}" (por administrador)`, "Documentos");
  await notificarCliente(clienteId, "documento", "Carpeta creada", `Se creó la carpeta "${nombre}"`, "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return data.id as string;
}

export async function eliminarCarpetaAdmin(carpetaId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: docs } = await supabase
    .from("documentos_carpeta")
    .select("url_storage")
    .eq("carpeta_id", carpetaId);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.url_storage).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from("documentos").remove(paths);
    }
  }

  const { error } = await supabase
    .from("carpetas_documentos")
    .delete()
    .eq("id", carpetaId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "documento", "Carpeta eliminada", "Se eliminó una carpeta y sus documentos", "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function subirDocCarpetaAdmin(carpetaId: string, clienteId: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivo(file);

  const path = `${clienteId}/carpetas/${carpetaId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const nombrePersonalizado = (formData.get("nombreArchivo") as string | null)?.trim();
  const nombreFinal = nombrePersonalizado || file.name;

  const { data: docInserted, error } = await supabase.from("documentos_carpeta").insert({
    carpeta_id: carpetaId,
    nombre_archivo: nombreFinal,
    url_storage: path,
    subido_por: admin.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  sincronizarArchivoSiActivo(clienteId, nombreFinal, path).catch((e) => console.error("[sync]", e));
  await notificarCliente(clienteId, "documento", "Documento subido", `Se subió "${nombreFinal}"`, "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { docId: docInserted.id };
}

export async function vincularDocAActividadRat(
  docId: string,
  clienteId: string,
  actividadRatId: string,
  nombreActividad: string
) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("documentos_carpeta")
    .update({ actividad_rat_id: actividadRatId, nombre_actividad_rat: nombreActividad })
    .eq("id", docId);
  if (error) throw new Error(error.message);
  await registrarHistorial(clienteId, `Documento vinculado a actividad RAT "${nombreActividad}"`, "Documentos");
  await notificarCliente(clienteId, "documento", "Documento vinculado a RAT", `Se vinculó un documento a la actividad "${nombreActividad}"`, "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function reemplazarDocCarpeta(docId: string, clienteId: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivo(file);

  const { data: docActual } = await supabase
    .from("documentos_carpeta")
    .select("id, carpeta_id, doc_original_id, version, url_storage, actividad_rat_id, nombre_actividad_rat")
    .eq("id", docId)
    .single();
  if (!docActual) throw new Error("Documento no encontrado.");

  const originalId = docActual.doc_original_id ?? docActual.id;

  const { data: versiones } = await supabase
    .from("documentos_carpeta")
    .select("id, version, url_storage")
    .or(`id.eq.${originalId},doc_original_id.eq.${originalId}`)
    .order("version", { ascending: true });

  const lista = versiones ?? [];

  if (lista.length >= 3) {
    const masAntigua = lista[0];
    if (masAntigua.url_storage) {
      await supabase.storage.from("documentos").remove([masAntigua.url_storage]);
    }
    await supabase.from("documentos_carpeta").delete().eq("id", masAntigua.id);
    for (let i = 1; i < lista.length; i++) {
      await supabase
        .from("documentos_carpeta")
        .update({ version: lista[i].version - 1 })
        .eq("id", lista[i].id);
    }
  }

  const nuevaVersion = lista.length >= 3 ? 3 : lista.length + 1;
  const path = `${clienteId}/carpetas/${docActual.carpeta_id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const nombrePersonalizado = (formData.get("nombreArchivo") as string | null)?.trim();
  const nombreFinal = nombrePersonalizado || file.name;

  const { error } = await supabase.from("documentos_carpeta").insert({
    carpeta_id: docActual.carpeta_id,
    nombre_archivo: nombreFinal,
    url_storage: path,
    subido_por: admin.id,
    version: nuevaVersion,
    doc_original_id: originalId === docActual.id ? docActual.id : originalId,
    actividad_rat_id: docActual.actividad_rat_id ?? null,
    nombre_actividad_rat: docActual.nombre_actividad_rat ?? null,
  });
  if (error) throw new Error(error.message);

  sincronizarArchivoSiActivo(clienteId, nombreFinal, path).catch((e) => console.error("[sync]", e));
  await registrarHistorial(clienteId, `Documento reemplazado: ${nombreFinal} (v${nuevaVersion})`, "Documentos");
  await notificarCliente(clienteId, "documento", "Documento reemplazado", `Se reemplazó "${nombreFinal}" (v${nuevaVersion})`, "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function renombrarDocCarpetaAdmin(docId: string, clienteId: string, nuevoNombre: string) {
  await requireAdmin();
  const nombre = nuevoNombre.trim();
  if (!nombre) throw new Error("El nombre no puede estar vacío.");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("documentos_carpeta")
    .update({ nombre_archivo: nombre })
    .eq("id", docId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "documento", "Documento renombrado", `Se renombró un documento a "${nombre}"`, "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarDocCarpetaAdmin(docId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("documentos_carpeta")
    .select("url_storage")
    .eq("id", docId)
    .single();

  if (doc?.url_storage) {
    await supabase.storage.from("documentos").remove([doc.url_storage]);
  }

  const { error } = await supabase
    .from("documentos_carpeta")
    .delete()
    .eq("id", docId);
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "documento", "Documento eliminado", "Se eliminó un documento de carpeta", "Documentos");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function subirDocRatEnCarpeta(
  clienteId: string,
  actividadId: string,
  nombreActividad: string,
  carpetaNombre: string,
  formData: FormData
) {
  const admin = await requireAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecciona un archivo.");
  const ext = validarArchivo(file);

  const supabase = createAdminClient();

  const { data: actividad } = await supabase
    .from("actividades_rat")
    .select("id, nombre_actividad, rat_version_id, rat_versiones!inner(profile_id)")
    .eq("id", actividadId)
    .single();
  if (!actividad) throw new Error("Actividad no encontrada.");

  let { data: carpeta } = await supabase
    .from("carpetas_documentos")
    .select("id")
    .eq("profile_id", clienteId)
    .eq("nombre", carpetaNombre)
    .maybeSingle();

  if (!carpeta) {
    const { data: newCarpeta, error: carpetaErr } = await supabase
      .from("carpetas_documentos")
      .insert({ profile_id: clienteId, nombre: carpetaNombre, created_by: admin.id })
      .select("id")
      .single();
    if (carpetaErr) throw new Error(carpetaErr.message);
    carpeta = newCarpeta;
  }

  const path = `${clienteId}/carpetas/${carpeta!.id}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const nombrePersonalizado = (formData.get("nombreArchivo") as string | null)?.trim();
  const nombreFinal = nombrePersonalizado || file.name;

  const { error } = await supabase.from("documentos_carpeta").insert({
    carpeta_id: carpeta!.id,
    nombre_archivo: nombreFinal,
    url_storage: path,
    subido_por: admin.id,
    actividad_rat_id: actividadId,
    nombre_actividad_rat: nombreActividad,
  });
  if (error) throw new Error(error.message);

  await notificarCliente(clienteId, "documento", "Documento RAT subido", `Se subió "${nombreFinal}" vinculado a actividad RAT`, "RAT");
  sincronizarArchivoSiActivo(clienteId, nombreFinal, path).catch((e) => console.error("[sync]", e));
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function eliminarDocumentoActividadRat(docId: string, clienteId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: doc } = await supabase.rpc("get_doc_actividad_rat", { p_doc_id: docId });

  if (doc?.url_storage) {
    await supabase.storage.from("documentos").remove([doc.url_storage]);
    await supabase.from("documentos_generales").delete().eq("url_storage", doc.url_storage);
  }

  const { error } = await supabase.rpc("delete_doc_actividad_rat", { p_doc_id: docId });
  if (error) throw new Error(error.message);
  await notificarCliente(clienteId, "documento", "Documento RAT eliminado", "Se eliminó un documento vinculado a actividad RAT", "RAT");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function obtenerBasesLicitudCustom() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bases_licitud_custom")
    .select("id, nombre")
    .order("created_at");
  if (error) return [];
  return data ?? [];
}

export async function crearBaseLicitudCustom(nombre: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bases_licitud_custom")
    .insert({ nombre: nombre.trim() });
  if (error) throw new Error(error.message);
}

export async function editarBaseLicitudCustom(id: string, nombre: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bases_licitud_custom")
    .update({ nombre: nombre.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function eliminarBaseLicitudCustom(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bases_licitud_custom")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
