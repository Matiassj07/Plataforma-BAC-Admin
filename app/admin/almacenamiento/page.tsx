import { getIntegracionesAlmacenamiento } from "@/lib/admin/almacenamiento";
import { AlmacenamientoShell } from "@/components/admin/almacenamiento/AlmacenamientoShell";

export default async function AlmacenamientoPage() {
  const integraciones = await getIntegracionesAlmacenamiento();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Almacenamiento</h1>
        <p className="text-sm text-bac-gray-text">
          Conecta servicios externos para sincronizar los documentos de los clientes.
        </p>
      </div>

      <AlmacenamientoShell integraciones={integraciones} />
    </div>
  );
}
