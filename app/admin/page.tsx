import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  FileUp,
  Gauge,
  Mail,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { getDashboardData } from "@/lib/admin/dashboard";
import { MetricCard } from "@/components/admin/MetricCard";
import { ScoreTrendChart } from "@/components/admin/dashboard/ScoreTrendChart";
import { SectorDonutChart } from "@/components/admin/dashboard/SectorDonutChart";
import { scoreColorClasses } from "@/lib/utils";

const PROVEEDOR_LABELS: Record<string, string> = {
  outlook: "Outlook",
  smtp_personalizado: "SMTP personalizado",
};

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const scoreColors = scoreColorClasses(data.scorePromedio ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-bac-gray-text">Vista general de la cartera de clientes BAC.</p>
      </div>

      {/* Fila 1 — Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Users} label="Total clientes" value={data.totalClientes} />
        <MetricCard
          icon={UserCheck}
          label="Clientes activos"
          value={data.clientesActivos}
          sublabel="Actividad en 30 días"
        />
        <MetricCard
          icon={Gauge}
          label="Score promedio"
          value={data.scorePromedio != null ? `${data.scorePromedio}%` : "—"}
          valueClassName={data.scorePromedio != null ? scoreColors.text : undefined}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Brechas críticas"
          value={data.brechasCriticas}
          valueClassName={data.brechasCriticas > 0 ? "text-bac-score-rojo" : undefined}
          sublabel="Sin resolver"
        />
        <MetricCard
          icon={FileUp}
          label="Docs subidos"
          value={data.docsEstaSemana}
          sublabel="Esta semana"
        />
      </div>

      {/* Fila 2 — Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-bac-gray-border bg-white p-4 lg:col-span-3">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Evolución del score promedio</h2>
          <p className="mb-2 text-xs text-bac-gray-text">Mes a mes, cartera completa</p>
          <ScoreTrendChart data={data.tendenciaScore} />
        </div>
        <div className="rounded-xl border border-bac-gray-border bg-white p-4 lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Distribución por sector</h2>
          <p className="mb-2 text-xs text-bac-gray-text">Clientes activos en la plataforma</p>
          <SectorDonutChart data={data.distribucionSector} />
        </div>
      </div>

      {/* Fila 3 — Alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-bac-score-rojo">
            <ShieldAlert className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Requieren atención inmediata</h2>
          </div>
          {data.clientesBrechasCriticas.length === 0 ? (
            <p className="text-sm text-bac-gray-text">Sin brechas críticas pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {data.clientesBrechasCriticas.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">
                    {c.nombre_empresa} —{" "}
                    <span className="font-medium text-bac-score-rojo">
                      {c.total} brecha{c.total > 1 ? "s" : ""} crítica{c.total > 1 ? "s" : ""} sin
                      resolver
                    </span>
                  </span>
                  <Link
                    href={`/admin/clientes/${c.id}`}
                    className="shrink-0 text-xs font-medium text-bac-red hover:underline"
                  >
                    Ver →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-bac-score-amarillo">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Pendientes</h2>
          </div>
          {data.clientesPendientes.length === 0 ? (
            <p className="text-sm text-bac-gray-text">No hay clientes pendientes de revisión.</p>
          ) : (
            <ul className="space-y-2">
              {data.clientesPendientes.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">
                    {c.nombre_empresa}{" "}
                    <span className="text-xs text-bac-gray-text">— {c.motivos.join(" · ")}</span>
                  </span>
                  <Link
                    href={`/admin/clientes/${c.id}`}
                    className="shrink-0 text-xs font-medium text-bac-red hover:underline"
                  >
                    Ver →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Fila 4 — Integraciones */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <IntegracionCard
          icon={Cloud}
          nombre="SharePoint"
          conectado={data.integraciones.sharepoint}
          href="/admin/almacenamiento"
        />
        <IntegracionCard
          icon={Cloud}
          nombre="OneDrive"
          conectado={data.integraciones.onedrive}
          href="/admin/almacenamiento"
        />
        <IntegracionCard
          icon={Mail}
          nombre={data.correoActivo ? PROVEEDOR_LABELS[data.correoActivo] : "Correo"}
          conectado={!!data.correoActivo}
          href="/admin/correos"
        />
      </div>
    </div>
  );
}

function IntegracionCard({
  icon: Icon,
  nombre,
  conectado,
  href,
}: {
  icon: typeof Cloud;
  nombre: string;
  conectado: boolean;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-bac-gray-border bg-white p-4">
      <div>
        <div className="flex items-center gap-2 text-gray-900">
          <Icon className="h-4 w-4 text-bac-gray-text" />
          <span className="text-sm font-medium">{nombre}</span>
        </div>
        <div
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            conectado ? "text-bac-score-verde" : "text-bac-score-rojo"
          }`}
        >
          {conectado ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {conectado ? "Conectado" : "Desconectado"}
        </div>
      </div>
      <Link
        href={href}
        className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-bac-gray-text hover:bg-bac-gray-alt"
      >
        {conectado ? "Gestionar" : "Conectar"}
      </Link>
    </div>
  );
}
