import { getClientesList, getSectoresDisponibles } from "@/lib/admin/clientes";
import { getBacConfig } from "@/lib/admin/configuracion";
import { ClientesFilters } from "@/components/admin/clientes/ClientesFilters";
import { ClientesTable } from "@/components/admin/clientes/ClientesTable";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filtros = {
    q: searchParams.q,
    tipo: searchParams.tipo,
    sector: searchParams.sector,
    score: searchParams.score,
    pro: searchParams.pro,
    actividad: searchParams.actividad,
    dpd: searchParams.dpd,
  };

  const [clientes, sectores, bacConfig] = await Promise.all([
    getClientesList(filtros),
    getSectoresDisponibles(),
    getBacConfig(),
  ]);
  const proGlobalActivo = bacConfig?.pro_global_activo ?? true;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
        <p className="text-sm text-bac-gray-text">
          {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} en la cartera.
        </p>
      </div>

      {!proGlobalActivo && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El PRO está desactivado globalmente en Configuración. Ningún cliente ve funcionalidades
          PRO aunque esté aprobado individualmente.
        </div>
      )}

      <ClientesFilters sectores={sectores} />
      <ClientesTable clientes={clientes} proGlobalActivo={proGlobalActivo} />
    </div>
  );
}
