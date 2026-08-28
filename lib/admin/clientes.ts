import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import type { TipoUsuarioEnum, DpdTipoEnum, EtapaFlujoEnum } from "@/lib/types";
import { SCORE_POR_ETAPA } from "@/lib/flujo-format";

export interface ClienteListItem {
  id: string;
  nombre_empresa: string;
  email: string;
  tipo_usuario: TipoUsuarioEnum;
  sector: string | null;
  es_pro: boolean;
  pro_aprobado_por_admin: boolean;
  suspendido: boolean;
  ultima_actividad: string | null;
  created_at: string;
  score: number | null;
  docsCount: number;
  telefono: string | null;
  ruc: string | null;
  direccion: string | null;
  web: string | null;
  dpd_tipo: DpdTipoEnum | null;
  dpd_activo: boolean;
}

export interface ClientesFiltros {
  q?: string;
  tipo?: string;
  sector?: string;
  score?: string; // bajo | medio | alto
  pro?: string; // aprobado | no_aprobado
  actividad?: string; // activo | inactivo
  dpd?: string; // activo | no_activo
}

function diasDesdeNow(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
}

export async function getClientesList(filtros: ClientesFiltros): Promise<ClienteListItem[]> {
  await requireStaff();
  const supabase = createAdminClient();

  const [{ data: profiles }, { data: flujos }, { data: docs }, { data: carpetaDocs }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, nombre_empresa, email, tipo_usuario, sector, es_pro, pro_aprobado_por_admin, suspendido, ultima_actividad, created_at, telefono, ruc, direccion, web, dpd_tipo, dpd_activo"
      )
      .eq("rol", "cliente"),
    supabase.from("flujo_estados").select("profile_id, etapa").limit(5000),
    supabase.from("documentos_generales").select("profile_id").neq("tipo_documento", "rat_actividad").limit(5000),
    supabase.from("carpetas_documentos").select("profile_id, documentos_carpeta(id)").limit(5000),
  ]);

  const etapaPorCliente = new Map<string, EtapaFlujoEnum>();
  for (const row of flujos ?? []) {
    if (row.profile_id) etapaPorCliente.set(row.profile_id, row.etapa as EtapaFlujoEnum);
  }
  const docsCount = new Map<string, number>();
  for (const d of docs ?? []) {
    if (!d.profile_id) continue;
    docsCount.set(d.profile_id, (docsCount.get(d.profile_id) ?? 0) + 1);
  }
  for (const c of carpetaDocs ?? []) {
    if (!c.profile_id) continue;
    const count = (c.documentos_carpeta as any[])?.length ?? 0;
    if (count > 0) docsCount.set(c.profile_id, (docsCount.get(c.profile_id) ?? 0) + count);
  }

  let list: ClienteListItem[] = (profiles ?? []).map((p) => {
    const etapa = etapaPorCliente.get(p.id);
    const scoreEtapa = etapa ? (SCORE_POR_ETAPA[etapa] ?? 0) : 0;
    return {
      ...p,
      dpd_tipo: (p.dpd_tipo as DpdTipoEnum) ?? null,
      dpd_activo: p.dpd_activo ?? false,
      score: scoreEtapa,
      docsCount: docsCount.get(p.id) ?? 0,
    };
  });

  if (filtros.q) {
    const q = filtros.q.toLowerCase();
    list = list.filter(
      (c) => c.nombre_empresa.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }
  if (filtros.tipo) {
    list = list.filter((c) => c.tipo_usuario === filtros.tipo);
  }
  if (filtros.sector) {
    list = list.filter((c) => (c.sector || "Sin sector") === filtros.sector);
  }
  if (filtros.score) {
    list = list.filter((c) => {
      if (c.score == null) return false;
      if (filtros.score === "bajo") return c.score < 40;
      if (filtros.score === "medio") return c.score >= 40 && c.score < 70;
      if (filtros.score === "alto") return c.score >= 70;
      return true;
    });
  }
  if (filtros.pro) {
    list = list.filter((c) =>
      filtros.pro === "aprobado" ? c.pro_aprobado_por_admin : !c.pro_aprobado_por_admin
    );
  }
  if (filtros.actividad) {
    list = list.filter((c) => {
      const dias = diasDesdeNow(c.ultima_actividad);
      const activo = dias !== null && dias <= 30;
      return filtros.actividad === "activo" ? activo : !activo;
    });
  }
  if (filtros.dpd) {
    list = list.filter((c) =>
      filtros.dpd === "activo" ? c.dpd_activo : !c.dpd_activo
    );
  }

  return list.sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa));
}

export async function getSectoresDisponibles(): Promise<string[]> {
  await requireStaff();
  const supabase = createAdminClient();
  const { data } = await supabase.from("profiles").select("sector").eq("rol", "cliente");
  const set = new Set<string>();
  for (const row of data ?? []) set.add(row.sector || "Sin sector");
  return Array.from(set).sort();
}
