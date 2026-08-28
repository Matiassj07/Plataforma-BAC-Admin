import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { SECTOR_LABELS } from "@/lib/types";

const DIA_MS = 1000 * 60 * 60 * 24;

function diasDesdeNow(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / DIA_MS);
}

export interface ClienteAlerta {
  id: string;
  nombre_empresa: string;
  motivos: string[];
}

export interface DashboardData {
  totalClientes: number;
  clientesActivos: number;
  scorePromedio: number | null;
  brechasCriticas: number;
  docsEstaSemana: number;
  tendenciaScore: { mes: string; promedio: number }[];
  distribucionSector: { sector: string; total: number }[];
  clientesBrechasCriticas: { id: string; nombre_empresa: string; total: number }[];
  clientesPendientes: ClienteAlerta[];
  integraciones: {
    sharepoint: boolean;
    onedrive: boolean;
  };
  correoActivo: string | null;
}

export async function getDashboardData(): Promise<DashboardData> {
  await requireStaff();
  const supabase = createAdminClient();

  const [
    { data: profiles },
    { data: scoreHist },
    { data: docs },
    { data: brechas },
    { data: integraciones },
    { data: correo },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nombre_empresa, sector, ultima_actividad, created_at")
      .eq("rol", "cliente"),
    supabase.from("score_historial").select("profile_id, score, mes").order("mes").limit(5000),
    supabase.from("documentos_generales").select("profile_id, fecha_subida").limit(5000),
    supabase
      .from("brechas_cumplimiento")
      .select("id, severidad, resuelta, analisis_ia(profile_id)")
      .limit(2000),
    supabase.from("integraciones_almacenamiento").select("proveedor, activo"),
    supabase.from("config_correo").select("proveedor").eq("activo", true).limit(1).maybeSingle(),
  ]);

  const clientes = profiles ?? [];
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter((c) => {
    const d = diasDesdeNow(c.ultima_actividad);
    return d !== null && d <= 30;
  }).length;

  // Score más reciente por cliente (score_historial viene ordenado por mes asc)
  const latestScoreByProfile = new Map<string, number>();
  for (const row of scoreHist ?? []) {
    if (row.profile_id && row.score != null) latestScoreByProfile.set(row.profile_id, row.score);
  }
  const scores = Array.from(latestScoreByProfile.values());
  const scorePromedio =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const brechasCriticas = (brechas ?? []).filter(
    (b) => b.severidad === "critica" && !b.resuelta
  ).length;

  const docsEstaSemana = (docs ?? []).filter((d) => {
    const dias = diasDesdeNow(d.fecha_subida);
    return dias !== null && dias <= 7;
  }).length;

  // Tendencia de score promedio mes a mes
  const porMes = new Map<string, number[]>();
  for (const row of scoreHist ?? []) {
    if (!row.mes || row.score == null) continue;
    const key = row.mes.slice(0, 7); // YYYY-MM
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

  // Distribución por sector
  const sectorCount = new Map<string, number>();
  for (const c of clientes) {
    const label = c.sector || "Sin sector";
    sectorCount.set(label, (sectorCount.get(label) ?? 0) + 1);
  }
  const distribucionSector = Array.from(sectorCount.entries())
    .map(([sector, total]) => ({ sector, total }))
    .sort((a, b) => b.total - a.total);

  // Clientes con brechas críticas sin resolver
  const criticasPorCliente = new Map<string, number>();
  for (const b of brechas ?? []) {
    if (b.severidad !== "critica" || b.resuelta) continue;
    const rel = b.analisis_ia as unknown as { profile_id: string | null } | null;
    const profileId = rel?.profile_id;
    if (!profileId) continue;
    criticasPorCliente.set(profileId, (criticasPorCliente.get(profileId) ?? 0) + 1);
  }
  const clienteById = new Map(clientes.map((c) => [c.id, c]));
  const clientesBrechasCriticas = Array.from(criticasPorCliente.entries())
    .map(([id, total]) => ({
      id,
      nombre_empresa: clienteById.get(id)?.nombre_empresa ?? "Cliente",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Documentos por cliente para detectar >6 meses sin actualizar
  const docsPorCliente = new Map<string, string[]>();
  for (const d of docs ?? []) {
    if (!d.profile_id || !d.fecha_subida) continue;
    if (!docsPorCliente.has(d.profile_id)) docsPorCliente.set(d.profile_id, []);
    docsPorCliente.get(d.profile_id)!.push(d.fecha_subida);
  }

  const pendientesMap = new Map<string, ClienteAlerta>();
  function addMotivo(id: string, nombre_empresa: string, motivo: string) {
    if (!pendientesMap.has(id)) pendientesMap.set(id, { id, nombre_empresa, motivos: [] });
    pendientesMap.get(id)!.motivos.push(motivo);
  }

  for (const c of clientes) {
    const score = latestScoreByProfile.get(c.id);
    if (score !== undefined && score < 40) {
      addMotivo(c.id, c.nombre_empresa, `Score ${score}%`);
    }
    const diasInactivo = diasDesdeNow(c.ultima_actividad);
    if (diasInactivo === null || diasInactivo > 30) {
      addMotivo(
        c.id,
        c.nombre_empresa,
        diasInactivo === null ? "Sin actividad registrada" : `Sin actividad ${diasInactivo}d`
      );
    }
    const fechas = docsPorCliente.get(c.id) ?? [];
    const masAntiguoDias = fechas.length > 0 ? Math.max(...fechas.map((f) => diasDesdeNow(f)!)) : null;
    if (masAntiguoDias !== null && masAntiguoDias > 180) {
      addMotivo(c.id, c.nombre_empresa, "Doc. sin actualizar +6 meses");
    }
  }
  const clientesPendientes = Array.from(pendientesMap.values()).slice(0, 8);

  const integracionesActivas = { sharepoint: false, onedrive: false };
  for (const i of integraciones ?? []) {
    if (i.activo && i.proveedor in integracionesActivas) {
      integracionesActivas[i.proveedor as keyof typeof integracionesActivas] = true;
    }
  }

  return {
    totalClientes,
    clientesActivos,
    scorePromedio,
    brechasCriticas,
    docsEstaSemana,
    tendenciaScore,
    distribucionSector,
    clientesBrechasCriticas,
    clientesPendientes,
    integraciones: integracionesActivas,
    correoActivo: correo?.proveedor ?? null,
  };
}

export { SECTOR_LABELS };
