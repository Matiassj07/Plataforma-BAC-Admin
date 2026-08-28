import { requireStaff } from "@/lib/auth";
import { ROL_LABELS } from "@/lib/types";
import { formatearFecha } from "@/lib/utils";
import { PerfilForm } from "@/components/admin/perfil/PerfilForm";
import { CambiarPasswordForm } from "@/components/admin/perfil/CambiarPasswordForm";

export default async function PerfilAdminPage() {
  const profile = await requireStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-bac-gray-text">
          Gestiona tu información personal y credenciales de acceso.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-bac-gray-border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Información de la cuenta</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-bac-gray-text">Correo electrónico</span>
                <span className="font-medium text-gray-900">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bac-gray-text">Rol</span>
                <span className="font-medium text-gray-900">{ROL_LABELS[profile.rol]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bac-gray-text">Tipo de usuario</span>
                <span className="font-medium text-gray-900">
                  {profile.tipo_usuario === "interno_bac" ? "Interno BAC" : profile.tipo_usuario === "cliente_externo" ? "Cliente externo" : "Revendedor"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-bac-gray-text">Registrado</span>
                <span className="font-medium text-gray-900">{formatearFecha(profile.created_at)}</span>
              </div>
            </div>
          </div>

          <CambiarPasswordForm />
        </div>

        <PerfilForm profile={profile} />
      </div>
    </div>
  );
}
