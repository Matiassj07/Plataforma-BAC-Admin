"use client";

import { useState, useTransition } from "react";
import { actualizarMiPerfil } from "@/lib/admin/perfil-actions";
import type { Profile } from "@/lib/types";

const INPUT_CLASS =
  "w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function PerfilForm({ profile }: { profile: Profile }) {
  const [nombreEmpresa, setNombreEmpresa] = useState(profile.nombre_empresa || "");
  const [telefono, setTelefono] = useState(profile.telefono || "");
  const [direccion, setDireccion] = useState(profile.direccion || "");
  const [web, setWeb] = useState(profile.web || "");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    startTransition(async () => {
      try {
        await actualizarMiPerfil({
          nombre_empresa: nombreEmpresa,
          telefono: telefono || null,
          direccion: direccion || null,
          web: web || null,
        });
        setMensaje("Perfil actualizado correctamente.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-bac-gray-border bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Datos personales</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Nombre / Empresa *
          </label>
          <input
            required
            className={INPUT_CLASS}
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Teléfono</label>
          <input
            className={INPUT_CLASS}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+593 99 999 9999"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Dirección</label>
          <input
            className={INPUT_CLASS}
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Av. Principal 123, Quito"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Sitio web</label>
          <input
            className={INPUT_CLASS}
            value={web}
            onChange={(e) => setWeb(e.target.value)}
            placeholder="https://ejemplo.com"
          />
        </div>

        {mensaje && <p className="text-sm text-bac-score-verde">{mensaje}</p>}
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-bac-red px-5 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
