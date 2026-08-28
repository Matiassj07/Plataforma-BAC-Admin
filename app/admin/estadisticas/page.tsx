import { FileUp, Gauge, ShieldAlert, TrendingUp } from "lucide-react";
import { getEstadisticasData } from "@/lib/admin/estadisticas";
import { getSectoresDisponibles } from "@/lib/admin/clientes";
import { MetricCard } from "@/components/admin/MetricCard";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { EstadisticasFilters } from "@/components/admin/estadisticas/EstadisticasFilters";
import { ScoreTrendChart } from "@/components/admin/dashboard/ScoreTrendChart";
import { SectorDonutChart } from "@/components/admin/dashboard/SectorDonutChart";
import { DistribucionScoreChart } from "@/components/admin/estadisticas/DistribucionScoreChart";
import { DocumentosPorClienteChart } from "@/components/admin/estadisticas/DocumentosPorClienteChart";
import { ActividadSemanalChart } from "@/components/admin/estadisticas/ActividadSemanalChart";
import { NIVEL_HEX, NIVEL_LABELS, type NivelRiesgo } from "@/lib/riesgos-format";
import { formatearFecha } from "@/lib/utils";

const SEVERIDAD_LABEL: Record<string, string> = {
  critica: "Crítica",
  media: "Media",
  baja: "Baja",
};
const SEVERIDAD_CLASS: Record<string, string> = {
  critica: "bg-red-100 text-bac-score-rojo",
  media: "bg-amber-100 text-bac-score-amarillo",
  baja: "bg-bac-gray-alt text-bac-gray-text",
};

const ORDEN_NIVELES: NivelRiesgo[] = ["critico", "alto", "medio", "bajo", "muy_bajo"];

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filtros = {
    periodo: searchParams.periodo,
    sector: searchParams.sector,
    tipoUsuario: searchParams.tipoUsuario,
  };

  const [data, sectores] = await Promise.all([
    getEstadisticasData(filtros),
    getSectoresDisponibles(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-bac-gray-text">
          {data.totalClientes} cliente{data.totalClientes !== 1 ? "s" : ""} en la cartera ·
          Actualizado al {formatearFecha(new Date().toISOString())}.
        </p>
      </div>

      <EstadisticasFilters sectores={sectores} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Gauge}
          label="Score promedio cartera"
          value={data.scorePromedioCartera != null ? `${data.scorePromedioCartera}%` : "—"}
        />
        <MetricCard icon={TrendingUp} label="Clientes con score >70%" value={data.clientesScoreAlto} />
        <MetricCard icon={FileUp} label="Documentos subidos" value={data.documentosEsteMes} sublabel="Este mes" />
        <MetricCard
          icon={ShieldAlert}
          label="Brechas registradas"
          value={data.brechasEsteMes}
          sublabel="Este mes"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-bac-gray-border bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Score promedio mes a mes</h2>
          <p className="mb-2 text-xs text-bac-gray-text">Cartera completa</p>
          <ScoreTrendChart data={data.tendenciaScore} />
        </div>
        <div className="rounded-xl border border-bac-gray-border bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Distribución de scores actuales</h2>
          <p className="mb-2 text-xs text-bac-gray-text">Clientes por rango de cumplimiento</p>
          <DistribucionScoreChart data={data.distribucionScore} />
        </div>
        <div className="rounded-xl border border-bac-gray-border bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Distribución por sector</h2>
          <p className="mb-2 text-xs text-bac-gray-text">Clientes de la cartera</p>
          <SectorDonutChart data={data.distribucionSector} />
        </div>
        <div className="rounded-xl border border-bac-gray-border bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Actividad de la plataforma</h2>
          <p className="mb-2 text-xs text-bac-gray-text">Acciones por semana</p>
          <ActividadSemanalChart data={data.actividadSemanal} />
        </div>
      </div>

      <div className="rounded-xl border border-bac-gray-border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Documentos completados por cliente</h2>
        <p className="mb-2 text-xs text-bac-gray-text">Ordenado de mayor a menor</p>
        <DocumentosPorClienteChart data={data.documentosPorCliente} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankingLista titulo="Top 5 mayor cumplimiento" items={data.topMayorCumplimiento} />
        <RankingLista titulo="Top 5 menor cumplimiento" items={data.topMenorCumplimiento} />
      </div>

      <div className="rounded-xl border border-bac-gray-border bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Brechas activas en la cartera</h2>
        <p className="mb-2 text-xs text-bac-gray-text">Ordenadas por días sin resolver</p>
        {data.brechasActivas.length === 0 ? (
          <p className="text-sm text-bac-gray-text">Sin brechas activas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-bac-gray-border text-xs font-medium uppercase tracking-wide text-bac-gray-text">
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Campo</th>
                  <th className="px-3 py-2">Severidad</th>
                  <th className="px-3 py-2">Días sin resolver</th>
                  <th className="px-3 py-2">Art. LOPDP</th>
                </tr>
              </thead>
              <tbody>
                {data.brechasActivas.map((b, i) => (
                  <tr key={i} className="border-b border-bac-gray-border last:border-0">
                    <td className="px-3 py-2 text-gray-800">{b.cliente}</td>
                    <td className="px-3 py-2 text-bac-gray-text">{b.campo}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERIDAD_CLASS[b.severidad] ?? ""}`}
                      >
                        {SEVERIDAD_LABEL[b.severidad] ?? b.severidad}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800">{b.diasSinResolver}</td>
                    <td className="px-3 py-2 text-bac-gray-text">{b.articuloLopdp ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-bac-gray-border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Niveles de riesgo en la cartera</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ORDEN_NIVELES.map((nivel) => (
            <div key={nivel} className="rounded-lg bg-bac-gray-alt p-3 text-center">
              <p className="text-2xl font-semibold" style={{ color: `#${NIVEL_HEX[nivel]}` }}>
                {data.nivelesRiesgo[nivel]}
              </p>
              <p className="text-xs text-bac-gray-text">{NIVEL_LABELS[nivel]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RankingLista({
  titulo,
  items,
}: {
  titulo: string;
  items: { id: string; nombre_empresa: string; sector: string | null; score: number }[];
}) {
  return (
    <div className="rounded-xl border border-bac-gray-border bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-gray-900">{titulo}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-bac-gray-text">Sin datos suficientes.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c, i) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg bg-bac-gray-alt px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-4 text-xs font-semibold text-bac-gray-text">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.nombre_empresa}</p>
                  <p className="text-xs text-bac-gray-text">{c.sector ?? "Sin sector"}</p>
                </div>
              </div>
              <ScoreBadge score={c.score} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
