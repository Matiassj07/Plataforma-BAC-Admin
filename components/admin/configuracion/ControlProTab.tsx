"use client";

import { useState, useEffect, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { setProGlobalActivo } from "@/lib/admin/configuracion-actions";
import type { BacConfig } from "@/lib/admin/configuracion-types";

export function ControlProTab({ config }: { config: BacConfig | null }) {
  const [activo, setActivo] = useState(config?.pro_global_activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (config) setActivo(config.pro_global_activo);
  }, [config?.pro_global_activo]);

  function toggle() {
    if (!config) return;
    const nuevo = !activo;
    setActivo(nuevo);
    setError(null);
    startTransition(async () => {
      try {
        await setProGlobalActivo(config.id, nuevo);
      } catch (err) {
        setActivo(!nuevo);
        setError(err instanceof Error ? err.message : "Error al actualizar.");
      }
    });
  }

  if (!config) {
    return <p className="text-sm text-bac-gray-text">No se pudo cargar la configuración de BAC.</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-bac-gray-border bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Funcionalidad PRO habilitada globalmente</p>
          <p className="mt-1 text-xs text-bac-gray-text">
            Si se desactiva, ningún cliente verá funcionalidades PRO en su panel, sin importar la
            aprobación individual que tenga en su expediente. Úsalo para pausar el PRO en toda la
            plataforma (por ejemplo, durante mantenimiento).
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={isPending}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            activo ? "bg-bac-red" : "bg-bac-gray-border"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
              activo ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-bac-gray-text">
        Estado actual: <span className="font-medium text-gray-900">{activo ? "Activado" : "Desactivado"}</span>
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-bac-score-rojo">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
