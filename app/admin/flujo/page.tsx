import { getFlujoData } from "@/lib/admin/flujo";
import { getSectoresDisponibles } from "@/lib/admin/clientes";
import { FlujoFilters } from "@/components/admin/flujo/FlujoFilters";
import { FlujoBoard } from "@/components/admin/flujo/FlujoBoard";

export default async function FlujoPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filtros = { sector: searchParams.sector, tipoUsuario: searchParams.tipoUsuario };
  const [tarjetas, sectores] = await Promise.all([
    getFlujoData(filtros),
    getSectoresDisponibles(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Flujo</h1>
        <p className="text-sm text-bac-gray-text">
          Arrastra las tarjetas entre columnas o usa el botón de avance manual. Las etapas RAT,
          Riesgos y Documentos avanzan automáticamente cuando el cliente completa cada módulo.
        </p>
      </div>

      <FlujoFilters sectores={sectores} />
      <FlujoBoard tarjetas={tarjetas} />
    </div>
  );
}
