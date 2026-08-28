import { getBacConfig, getAdministradores } from "@/lib/admin/configuracion";
import { requireAdmin } from "@/lib/auth";
import { ConfiguracionShell } from "@/components/admin/configuracion/ConfiguracionShell";

export default async function ConfiguracionPage() {
  const actor = await requireAdmin();
  const [config, administradores] = await Promise.all([getBacConfig(), getAdministradores()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-bac-gray-text">
          Datos de la empresa BAC, administradores de la plataforma y control global del plan PRO.
        </p>
      </div>

      <ConfiguracionShell config={config} administradores={administradores} actorId={actor.id} />
    </div>
  );
}
