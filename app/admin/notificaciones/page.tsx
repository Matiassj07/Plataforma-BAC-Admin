import { getConfigNotificaciones, getHistorialNotificaciones } from "@/lib/admin/notificaciones";
import { NotificacionesShell } from "@/components/admin/notificaciones/NotificacionesShell";

export default async function NotificacionesPage() {
  const config = await getConfigNotificaciones();
  const historial = await getHistorialNotificaciones();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Notificaciones</h1>
        <p className="text-sm text-bac-gray-text">
          Activa o desactiva las alertas automáticas de la plataforma y revisa su historial de envío.
        </p>
      </div>

      <NotificacionesShell config={config} historial={historial} />
    </div>
  );
}
