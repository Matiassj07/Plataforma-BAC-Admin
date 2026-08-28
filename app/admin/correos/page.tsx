import { getConfigCorreo, getPlantillasCorreo, getHistorialCorreos, getClientesParaCorreo } from "@/lib/admin/correos";
import { CorreosShell } from "@/components/admin/correos/CorreosShell";

export default async function CorreosPage() {
  const [config, plantillas, historial, clientes] = await Promise.all([
    getConfigCorreo(),
    getPlantillasCorreo(),
    getHistorialCorreos(),
    getClientesParaCorreo(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Correos</h1>
        <p className="text-sm text-bac-gray-text">
          Configura los proveedores de correo, plantillas de envío y gestiona el historial de mensajes.
        </p>
      </div>

      <CorreosShell config={config} plantillas={plantillas} historial={historial} clientes={clientes} />
    </div>
  );
}
