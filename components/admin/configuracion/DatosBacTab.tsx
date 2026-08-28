"use client";

import { useState, useTransition } from "react";
import { Check, AlertCircle } from "lucide-react";
import { guardarBacConfig } from "@/lib/admin/configuracion-actions";
import type { BacConfig } from "@/lib/admin/configuracion-types";

export function DatosBacTab({ config }: { config: BacConfig | null }) {
  const [nombre, setNombre] = useState(config?.nombre || "");
  const [correoContacto, setCorreoContacto] = useState(config?.correo_contacto || "");
  const [sitioWeb, setSitioWeb] = useState(config?.sitio_web || "");
  const idioma = "es";
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    if (!config) return;
    setError(null);
    setOk(false);
    if (!nombre.trim()) {
      setError("El nombre de la empresa es obligatorio.");
      return;
    }
    startTransition(async () => {
      try {
        await guardarBacConfig({
          id: config.id,
          nombre: nombre.trim(),
          correo_contacto: correoContacto.trim() || null,
          idioma,
          sitio_web: sitioWeb.trim() || null,
        });
        setOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  if (!config) {
    return <p className="text-sm text-bac-gray-text">No se pudo cargar la configuración de BAC.</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Nombre de la empresa</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Correo de contacto</label>
          <input
            type="email"
            value={correoContacto}
            onChange={(e) => setCorreoContacto(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Sitio web</label>
          <input
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>
      </div>


      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-bac-score-rojo">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-bac-score-verde">
          <Check className="h-4 w-4 shrink-0" />
          Datos guardados correctamente.
        </div>
      )}

      <button
        onClick={guardar}
        disabled={isPending}
        className="rounded-lg bg-bac-red px-5 py-2 text-sm font-semibold text-white hover:bg-bac-red-dark disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
