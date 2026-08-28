import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { getDpdData, type DpdData } from "./dpd";

export interface ActividadRat {
  id: string;
  activo_informacion: string | null;
  nombre_actividad: string | null;
  finalidad: string | null;
  categoria_datos: string[] | null;
  categorias_especiales: string | null;
  perfiles_automatizados: boolean | null;
  categorias_titulares: string[] | null;
  origen_datos: string | null;
  base_licitud: string | null;
  articulo_lopdp: string | null;
  plazo_conservacion: string | null;
  destinatarios: string | null;
  transferencias_internacionales: boolean | null;
  medidas_seguridad: string | null;
  almacenamiento: string | null;
  departamento: string | null;
}

export interface DocActividadRat {
  id: string;
  actividad_rat_id: string;
  nombre_archivo: string;
  url_storage: string;
  fecha_subida: string;
  version?: number;
  doc_original_id?: string | null;
}

export interface RatVersion {
  id: string;
  version: number;
  created_at: string;
  datos_responsable: Record<string, string> | null;
  datos_dpd: Record<string, string> | null;
  actividades: ActividadRat[];
  docsActividades: DocActividadRat[];
}

export interface ActividadRiesgo {
  id: string;
  codigo: string | null;
  area_departamento: string | null;
  actividad_tratamiento: string | null;
  cat_especiales_gran_escala: boolean | null;
  obs_sistematica_publica: boolean | null;
  trat_automatizado: boolean | null;
  activos_relacionados: string | null;
  base_legal: string | null;
  articulo_ley: string | null;
  amenazas: string | null;
  vulnerabilidades: string | null;
  medidas_implementadas: string | null;
  probabilidad: number | null;
  impacto: number | null;
  riesgo_inherente: number | null;
  nivel_riesgo: string | null;
  requiere_eipd: boolean | null;
  medidas_implementar: string | null;
  prob_residual: number | null;
  imp_residual: number | null;
  riesgo_residual: number | null;
  nivel_riesgo_residual: string | null;
  responsable_implementacion: string | null;
  semaforo: string | null;
}

export interface MatrizVersion {
  id: string;
  version: number;
  created_at: string;
  actividades: ActividadRiesgo[];
}

export interface DocumentoItem {
  id: string;
  nombre_archivo: string;
  tipo_documento: string | null;
  slug_requerido: string | null;
  estado: string;
  url_storage: string | null;
  fecha_subida: string | null;
  actividad_rat_id: string | null;
  nombre_actividad_rat: string | null;
}

export interface PersonalItem {
  id: string;
  nombre: string | null;
  cargo: string | null;
  area: string | null;
  fecha_firma: string | null;
  fecha_renovacion: string | null;
  email: string | null;
  auth_user_id: string | null;
  rol: string | null;
}

export interface DocCarpetaItem {
  id: string;
  nombre_archivo: string;
  url_storage: string;
  fecha_subida: string | null;
  actividad_rat_id?: string | null;
  nombre_actividad_rat?: string | null;
  version?: number;
  doc_original_id?: string | null;
}

export interface CambiosCampoRat {
  actividad_rat_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  version_cambio: number;
  created_at: string;
}

export interface CarpetaItem {
  id: string;
  nombre: string;
  created_at: string;
  carpeta_padre_id: string | null;
  documentos: DocCarpetaItem[];
  subcarpetas: CarpetaItem[];
}

function buildCarpetaTree(flat: CarpetaItem[]): CarpetaItem[] {
  const map = new Map<string, CarpetaItem>();
  for (const c of flat) map.set(c.id, c);
  const roots: CarpetaItem[] = [];
  for (const c of flat) {
    if (c.carpeta_padre_id && map.has(c.carpeta_padre_id)) {
      map.get(c.carpeta_padre_id)!.subcarpetas.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export interface BrechaSeguridadItem {
  id: string;
  tipo_incidente: string | null;
  descripcion: string | null;
  fecha_deteccion: string | null;
  obliga_notificar: boolean | null;
  articulo_base: string | null;
  estado: string | null;
  created_at: string;
}

export interface NotaInternaItem {
  id: string;
  contenido: string | null;
  created_at: string;
  autor: string;
  visible_cliente: boolean;
}

export interface HistorialItem {
  id: string;
  accion: string;
  modulo: string | null;
  created_at: string;
}

export interface CarpetaEjemploItem {
  id: string;
  nombre: string;
  documentos: { slug: string; nombre_archivo: string; url_storage: string }[];
}

export interface ExpedienteData {
  cliente: Profile;
  scoreHistorial: { mes: string; score: number }[];
  ratVersiones: RatVersion[];
  matrices: MatrizVersion[];
  documentos: DocumentoItem[];
  personal: PersonalItem[];
  brechasSeguridad: BrechaSeguridadItem[];
  notas: NotaInternaItem[];
  historial: HistorialItem[];
  dpd: DpdData;
  carpetas: CarpetaItem[];
  carpetasEjemplo: CarpetaEjemploItem[];
  cambiosCampoRat: CambiosCampoRat[];
  cambiosCampoRiesgo: CambiosCampoRat[];
  planesImplementacion: PlanImplementacion[];
  notificacionesCliente: NotificacionClienteItem[];
  actaEntrega: ActaEntregaItem | null;
}

export interface ActaEntregaItem {
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

export interface PlanImplementacion {
  id: string;
  profile_id: string;
  tipo: "rat" | "riesgos" | "documentos";
  actividad_origen_id: string | null;
  titulo: string;
  responsable: string | null;
  departamento: string | null;
  actividad_nombre: string | null;
  actividad_realizar: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  created_at: string;
}

export interface NotificacionClienteItem {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  modulo: string | null;
  leida: boolean;
  created_at: string;
}

export async function getExpedienteData(clienteId: string): Promise<ExpedienteData | null> {
  const supabase = createAdminClient();

  const { data: cliente } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", clienteId)
    .single();
  if (!cliente) return null;

  const [
    { data: scoreHist },
    { data: ratVersiones },
    { data: matrices },
    { data: documentos },
    { data: personal },
    { data: brechasSeguridad },
    { data: notas },
    { data: historial },
    dpd,
    { data: carpetasData },
    { data: docsActividadRat },
    { data: carpetasEjemploData },
    { data: docsEjemploAll },
  ] = await Promise.all([
    supabase
      .from("score_historial")
      .select("mes, score")
      .eq("profile_id", clienteId)
      .order("mes"),
    supabase
      .from("rat_versiones")
      .select("id, version, created_at, datos_responsable, datos_dpd, actividades_rat(*)")
      .eq("profile_id", clienteId)
      .order("version", { ascending: false }),
    supabase
      .from("matriz_riesgos")
      .select("id, version, created_at, actividades_riesgo(*)")
      .eq("profile_id", clienteId)
      .order("version", { ascending: false }),
    supabase
      .from("documentos_generales")
      .select("id, nombre_archivo, tipo_documento, slug_requerido, estado, url_storage, fecha_subida, actividad_rat_id, nombre_actividad_rat")
      .eq("profile_id", clienteId)
      .order("fecha_subida", { ascending: false }),
    supabase
      .from("personal")
      .select("id, nombre, cargo, area, fecha_firma, fecha_renovacion, email, auth_user_id, rol")
      .eq("profile_id", clienteId)
      .order("nombre"),
    supabase
      .from("brechas_seguridad")
      .select("id, tipo_incidente, descripcion, fecha_deteccion, obliga_notificar, articulo_base, estado, created_at")
      .eq("profile_id", clienteId)
      .order("fecha_deteccion", { ascending: false }),
    supabase
      .from("notas_internas")
      .select(
        "id, contenido, created_at, visible_cliente, admin:profiles!notas_internas_admin_id_fkey(nombre_empresa)"
      )
      .eq("profile_id", clienteId)
      .order("created_at", { ascending: false }),
    supabase
      .from("historial_acciones")
      .select("id, accion, modulo, created_at")
      .eq("profile_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(100),
    getDpdData(clienteId),
    supabase
      .from("carpetas_documentos")
      .select("id, nombre, created_at, carpeta_padre_id, documentos_carpeta(id, nombre_archivo, url_storage, fecha_subida, actividad_rat_id, nombre_actividad_rat, version, doc_original_id)")
      .eq("profile_id", clienteId)
      .order("created_at", { ascending: true }),
    supabase.rpc("select_docs_actividad_rat", { p_profile_id: clienteId }),
    supabase.rpc("select_carpetas_ejemplo"),
    supabase
      .from("documentos_ejemplo")
      .select("slug, nombre_archivo, url_storage, carpeta_ejemplo_id")
      .not("carpeta_ejemplo_id", "is", null),
  ]);

  const allActividadIds = (ratVersiones ?? []).flatMap((v: any) =>
    ((v.actividades_rat ?? []) as any[]).map((a: any) => a.id)
  );
  const { data: cambiosCampoData } = allActividadIds.length > 0
    ? await supabase
        .from("rat_cambios_campo")
        .select("actividad_rat_id, campo, valor_anterior, valor_nuevo, version_cambio, created_at")
        .in("actividad_rat_id", allActividadIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };

  const allRiesgoActividadIds = (matrices ?? []).flatMap((m: any) =>
    ((m.actividades_riesgo ?? []) as any[]).map((a: any) => a.id)
  );
  const { data: cambiosRiesgoData } = allRiesgoActividadIds.length > 0
    ? await supabase
        .from("riesgo_cambios_campo")
        .select("actividad_riesgo_id, campo, valor_anterior, valor_nuevo, version_cambio, created_at")
        .in("actividad_riesgo_id", allRiesgoActividadIds)
        .order("created_at", { ascending: true })
    : { data: [] as any[] };
  const [{ data: notificacionesData }, { data: planesData }, { data: actaData }] = await Promise.all([
    supabase
      .from("notificaciones_cliente")
      .select("id, tipo, titulo, descripcion, modulo, leida, created_at")
      .eq("profile_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("planes_implementacion")
      .select("*")
      .eq("profile_id", clienteId)
      .order("created_at", { ascending: false }),
    supabase
      .from("actas_entrega")
      .select("*")
      .eq("profile_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const docsFromCarpetas: DocActividadRat[] = (carpetasData ?? []).flatMap((c: any) =>
    ((c.documentos_carpeta ?? []) as any[])
      .filter((d: any) => d.actividad_rat_id)
      .map((d: any) => ({
        id: d.id,
        actividad_rat_id: d.actividad_rat_id,
        nombre_archivo: d.nombre_archivo,
        url_storage: d.url_storage,
        fecha_subida: d.fecha_subida,
        version: d.version ?? 1,
        doc_original_id: d.doc_original_id ?? null,
      }))
  );
  const rpcDocs = (docsActividadRat ?? []) as DocActividadRat[];
  const docsFromGenerales: DocActividadRat[] = ((documentos ?? []) as any[])
    .filter((d: any) => d.actividad_rat_id)
    .map((d: any) => ({
      id: d.id,
      actividad_rat_id: d.actividad_rat_id,
      nombre_archivo: d.nombre_archivo,
      url_storage: d.url_storage,
      fecha_subida: d.fecha_subida,
      version: 1,
      doc_original_id: null,
    }));
  const seenIds = new Set(docsFromCarpetas.map((d) => d.id));
  for (const d of rpcDocs) seenIds.add(d.id);
  const mergedDocs = [...docsFromCarpetas, ...rpcDocs.filter((d) => !seenIds.has(d.id)), ...docsFromGenerales.filter((d) => !seenIds.has(d.id))];

  return {
    cliente: cliente as Profile,
    scoreHistorial: (scoreHist ?? []).map((s) => ({ mes: s.mes as string, score: s.score as number })),
    ratVersiones: (ratVersiones ?? []).map((v) => {
      const actIds = new Set(((v.actividades_rat ?? []) as ActividadRat[]).map((a) => a.id));
      return {
        id: v.id,
        version: v.version,
        created_at: v.created_at,
        datos_responsable: v.datos_responsable as Record<string, string> | null,
        datos_dpd: v.datos_dpd as Record<string, string> | null,
        actividades: ((v.actividades_rat ?? []) as any[])
          .sort((a: any, b: any) => (a.created_at ?? "").localeCompare(b.created_at ?? "")) as ActividadRat[],
        docsActividades: mergedDocs.filter((d) => actIds.has(d.actividad_rat_id)),
      };
    }),
    matrices: (matrices ?? []).map((m) => ({
      id: m.id,
      version: m.version,
      created_at: m.created_at,
      actividades: ((m.actividades_riesgo ?? []) as any[])
        .sort((a: any, b: any) => (a.created_at ?? "").localeCompare(b.created_at ?? "")) as ActividadRiesgo[],
    })),
    documentos: (documentos ?? []) as DocumentoItem[],
    personal: (personal ?? []) as PersonalItem[],
    brechasSeguridad: ((brechasSeguridad ?? []) as BrechaSeguridadItem[]).filter((b) => {
      if (b.estado === "cerrada") {
        const created = new Date(b.created_at).getTime();
        if (Date.now() - created > 5 * 24 * 60 * 60 * 1000) {
          supabase.from("brechas_seguridad").delete().eq("id", b.id).then(() => {});
          return false;
        }
      }
      return true;
    }),
    notas: (notas ?? []).map((n) => ({
      id: n.id,
      contenido: n.contenido,
      created_at: n.created_at,
      visible_cliente: n.visible_cliente,
      autor: (n.admin as unknown as { nombre_empresa: string } | null)?.nombre_empresa ?? "Admin",
    })),
    historial: (historial ?? []) as HistorialItem[],
    dpd,
    carpetas: buildCarpetaTree((carpetasData ?? []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      created_at: c.created_at,
      carpeta_padre_id: c.carpeta_padre_id ?? null,
      documentos: (c.documentos_carpeta ?? []) as DocCarpetaItem[],
      subcarpetas: [],
    }))),
    carpetasEjemplo: ((carpetasEjemploData ?? []) as any[]).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      documentos: ((docsEjemploAll ?? []) as any[])
        .filter((d: any) => d.carpeta_ejemplo_id === c.id)
        .map((d: any) => ({ slug: d.slug, nombre_archivo: d.nombre_archivo, url_storage: d.url_storage })),
    })),
    cambiosCampoRat: (cambiosCampoData ?? []) as CambiosCampoRat[],
    cambiosCampoRiesgo: ((cambiosRiesgoData ?? []) as any[]).map((c: any) => ({
      actividad_rat_id: c.actividad_riesgo_id,
      campo: c.campo,
      valor_anterior: c.valor_anterior,
      valor_nuevo: c.valor_nuevo,
      version_cambio: c.version_cambio,
      created_at: c.created_at,
    })) as CambiosCampoRat[],
    planesImplementacion: (planesData ?? []) as PlanImplementacion[],
    notificacionesCliente: (notificacionesData ?? []) as NotificacionClienteItem[],
    actaEntrega: (actaData as ActaEntregaItem) ?? null,
  };
}
