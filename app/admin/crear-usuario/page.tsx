import { requireAdmin } from "@/lib/auth";
import { CrearUsuarioFlow } from "@/components/admin/crear-usuario/CrearUsuarioFlow";
import { obtenerSectoresCustom } from "@/lib/admin/sectores-actions";

export default async function CrearUsuarioPage() {
  await requireAdmin();
  const sectoresCustom = await obtenerSectoresCustom();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Crear usuario</h1>
        <p className="text-sm text-bac-gray-text">
          Crea una cuenta nueva en la plataforma y configura su tipo y visibilidad PRO.
        </p>
      </div>
      <CrearUsuarioFlow sectoresCustom={sectoresCustom} />
    </div>
  );
}
