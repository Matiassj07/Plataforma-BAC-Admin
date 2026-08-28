import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import type { NivelRiesgo } from "@/lib/riesgos-format";

export interface EstadisticasFiltros {
  periodo?: string; // "3" | "6" | "12" | "" (todo)
  sector?: string;
  tipoUsuario?: string;
}

function diasDesdeNow(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24));
}

function esDelMesActual(fecha: string | null): boolean {
  if (!fecha) return false;
  const d = new Date(fecha);
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
}

function fechaLimitePeriodo(periodo?: string): Date | null {
  if (!periodo) return null;
  const meses = Number(periodo);
  if (!meses) return null;
  const limite = new Date();
  limite.setMonth(limite.getMonth() - meses);
  return limite;
}

export interface EstadisticasData {
  totalClientes: number;
  scorePromedioCartera: number | null;
  clientesScoreAlto: number;
  documentosEsteMes: number;
  brechasEsteMes: number;
  tendenciaScore: { mes: string; promedio: number }[];
  distribucionScore: { rango: string; total: number; color: string }[];
  distribucionSector: { sector: string; total: number }[];
  documentosPorCliente: { nombre: string; docs: number }[];
  actividadSemanal: { semana: string; acciones: number }[];
  topMayorCumplimiento: { id: string; nombre_empresa: string; sector: string | null; score: number }[];
  topMenorCumplimiento: { id: string; nombre_empresa: string; sector: string | null; score: number }[];
  brechasActivas: {
    cliente: string;
    campo: string;
    severidad: string;
    diasSinResolver: number;
    articuloLopdp: string | null;
  }[];
  nivelesRiesgo: Record<NivelRiesgo, number>;
}

export async function getEstadisticasData(filtros: EstadisticasFiltros): Promise<EstadisticasData> {
  await requireStaff();
  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("id, nombre_empresa, sector, tipo_usuario, created_at")
    .eq("rol", "cliente");
  if (filtros.sector) query = query.eq("sector", filtros.sector);
  if (filtros.tipoUsuario) query = query.eq("tipo_usuario", filtros.tipoUsuario);
  const { data: profiles } = await query;

  const clientes = profiles ?? [];
  const ids = clientes.map((c) => c.id);
  const clienteById = new Map(clientes.map((c) => [c.id, c]));

  if (ids.length === 0) {
    return {
      totalClientes: 0,
      scorePromedioCartera: null,
      clientesScoreAlto: 0,
      documentosEsteMes: 0,
      brechasEsteMes: 0,
      tendenciaScore: [],
      distribucionScore: [],
      distribucionSector: [],
      documentosPorCliente: [],
      actividadSemanal: [],
      topMayorCumplimiento: [],
      topMenorCumplimiento: [],
      brechasActivas: [],
      nivelesRiesgo: { critico: 0, alto: 0, medio: 0, bajo: 0, muy_bajo: 0 },
    };
  }

  const [
    { data: scoreHist },
    { data: documentos },
    { data: brechas },
    { data: historial },
    { data: matrices },
  ] = await Promise.all([
    supabase.from("score_historial").select("profile_id, score, mes").in("profile_id", ids).order("mes").limit(5000),
    supabase.from("documentos_generales").select("profile_id, fecha_subida").in("profile_id", ids).limit(5000),
    supabase
      .from("brechas_cumplimiento")
      .select("id, campo, severidad, resuelta, articulo_lopdp, created_at, analisis_ia!inner(profile_id)")
      .in("analisis_ia.profile_id", ids)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("historial_acciones")
      .select("profile_id, created_at")
      .in("profile_id", ids)
      .gte("created_at", new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000),
    supabase
      .from("matriz_riesgos")
      .select("id, profile_id, version, actividades_riesgo(nivel_riesgo)")
      .in("profile_id", ids)
      .limit(1000),
  ]);

  const idsSet = new Set(ids);
  const brechasFiltradas = (brechas ?? []).filter((b) => {
    const rel = b.analisis_ia as unknown as { profile_id: string | null } | null;
    return rel?.profile_id && idsSet.has(rel.profile_id);
  });

  // Score más reciente por cliente
  const latestScore = new Map<string, number>();
  for (const row of scoreHist ?? []) {
    if (row.profile_id && row.score != null) latestScore.set(row.profile_id, row.score);
  }
  const scores = Array.from(latestScore.values());
  const scorePromedioCartera =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const clientesScoreAlto = scores.filter((s) => s > 70).length;

  const documentosEsteMes = (documentos ?? []).filter((d) => esDelMesActual(d.fecha_subida)).length;
  const brechasEsteMes = brechasFiltradas.filter((b) => esDelMesActual(b.created_at)).length;

  // Tendencia de score (respetando el período)
  const limite = fechaLimitePeriodo(filtros.periodo);
  const porMes = new Map<string, number[]>();
  for (const row of scoreHist ?? []) {
    if (!row.mes || row.score == null) continue;
    if (limite && new Date(row.mes) < limite) continue;
    const key = row.mes.slice(0, 7);
    if (!porMes.has(key)) porMes.set(key, []);
    porMes.get(key)!.push(row.score);
  }
  const tendenciaScore = Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, vals]) => ({
      mes: (() => {
        const d = new Date(`${mes}-01T00:00:00`);
        return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      })(),
      promedio: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));

  // Distribución de scores actuales
  const buckets = { bajo: 0, medio: 0, alto: 0 };
  for (const s of scores) {
    if (s < 40) buckets.bajo++;
    else if (s < 70) buckets.medio++;
    else buckets.alto++;
  }
  const distribucionScore = [
    { rango: "0-40%", total: buckets.bajo, color: "DC2626" },
    { rango: "41-70%", total: buckets.medio, color: "D97706" },
    { rango: "71-100%", total: buckets.alto, color: "16A34A" },
  ];

  // Distribución por sector
  const sectorCount = new Map<string, number>();
  for (const c of clientes) {
    const label = c.sector || "Sin sector";
    sectorCount.set(label, (sectorCount.get(label) ?? 0) + 1);
  }
  const distribucionSector = Array.from(sectorCount.entries())
    .map(([sector, total]) => ({ sector, total }))
    .sort((a, b) => b.total - a.total);

  // Documentos completados por cliente
  const docsPorCliente = new Map<string, number>();
  for (const d of documentos ?? []) {
    if (!d.profile_id) continue;
    docsPorCliente.set(d.profile_id, (docsPorCliente.get(d.profile_id) ?? 0) + 1);
  }
  const documentosPorCliente = clientes
    .map((c) => ({ nombre: c.nombre_empresa, docs: docsPorCliente.get(c.id) ?? 0 }))
    .sort((a, b) => b.docs - a.docs);

  // Actividad semanal (respetando período)
  const porSemana = new Map<string, number>();
  for (const row of historial ?? []) {
    if (!row.created_at) continue;
    if (limite && new Date(row.created_at) < limite) continue;
    const fecha = new Date(row.created_at);
    const inicioSemana = new Date(fecha);
    inicioSemana.setDate(fecha.getDate() - fecha.getDay());
    const key = inicioSemana.toISOString().slice(0, 10);
    porSemana.set(key, (porSemana.get(key) ?? 0) + 1);
  }
  const actividadSemanal = Array.from(porSemana.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([semana, acciones]) => ({
      semana: (() => {
        const d = new Date(`${semana}T00:00:00`);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      })(),
      acciones,
    }));

  // Ranking
  const conScore = clientes
    .filter((c) => latestScore.has(c.id))
    .map((c) => ({
      id: c.id,
      nombre_empresa: c.nombre_empresa,
      sector: c.sector,
      score: latestScore.get(c.id)!,
    }));
  const ordenadoDesc = [...conScore].sort((a, b) => b.score - a.score);
  const topMayorCumplimiento = ordenadoDesc.slice(0, 5);
  const topMenorCumplimiento = [...conScore].sort((a, b) => a.score - b.score).slice(0, 5);

  // Brechas activas en la cartera
  const brechasActivas = brechasFiltradas
    .filter((b) => !b.resuelta)
    .map((b) => {
      const rel = b.analisis_ia as unknown as { profile_id: string | null } | null;
      const cliente = rel?.profile_id ? clienteById.get(rel.profile_id) : null;
      return {
        cliente: cliente?.nombre_empresa ?? "Cliente",
        campo: b.campo ?? "—",
        severidad: b.severidad,
        diasSinResolver: diasDesdeNow(b.created_at) ?? 0,
        articuloLopdp: b.articulo_lopdp,
      };
    })
    .sort((a, b) => b.diasSinResolver - a.diasSinResolver);

  // Niveles de riesgo (última versión de matriz por cliente)
  const ultimaMatrizPorCliente = new Map<string, { id: string; version: number; actividades: { nivel_riesgo: string | null }[] }>();
  for (const m of matrices ?? []) {
    const actual = ultimaMatrizPorCliente.get(m.profile_id);
    if (!actual || m.version > actual.version) {
      ultimaMatrizPorCliente.set(m.profile_id, {
        id: m.id,
        version: m.version,
        actividades: (m.actividades_riesgo ?? []) as { nivel_riesgo: string | null }[],
      });
    }
  }
  const nivelesRiesgo: Record<NivelRiesgo, number> = {
    critico: 0,
    alto: 0,
    medio: 0,
    bajo: 0,
    muy_bajo: 0,
  };
  for (const matriz of ultimaMatrizPorCliente.values()) {
    for (const a of matriz.actividades) {
      if (a.nivel_riesgo && a.nivel_riesgo in nivelesRiesgo) {
        nivelesRiesgo[a.nivel_riesgo as NivelRiesgo]++;
      }
    }
  }

  return {
    totalClientes: clientes.length,
    scorePromedioCartera,
    clientesScoreAlto,
    documentosEsteMes,
    brechasEsteMes,
    tendenciaScore,
    distribucionScore,
    distribucionSector,
    documentosPorCliente,
    actividadSemanal,
    topMayorCumplimiento,
    topMenorCumplimiento,
    brechasActivas,
    nivelesRiesgo,
  };
}
