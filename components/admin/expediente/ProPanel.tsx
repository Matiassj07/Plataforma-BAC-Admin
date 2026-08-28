"use client";

import { useState, useEffect, useTransition } from "react";
import { setProAprobado } from "@/lib/admin/actions";

export function ProPanel({
  clienteId,
  aprobado,
  esInterno,
  proGlobalActivo,
}: {
  clienteId: string;
  aprobado: boolean;
  esInterno: boolean;
  proGlobalActivo: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimista, setOptimista] = useState(aprobado);

  useEffect(() => {
    setOptimista(aprobado);
  }, [aprobado]);

  function handleToggle() {
    const nuevo = !optimista;
    setOptimista(nuevo);
    startTransition(async () => {
      try {
        await setProAprobado(clienteId, nuevo);
      } catch {
        setOptimista(!nuevo);
      }
    });
  }

  return (
    <div className="rounded-xl border border-bac-gray-border bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">Control PRO</h2>
      <p className="mt-1 text-xs text-bac-gray-text">
        Estado PRO:{" "}
        <span className="font-medium">
          {proGlobalActivo && optimista ? "activo" : "inactivo"}
        </span>
      </p>

      {!proGlobalActivo && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          El PRO está desactivado globalmente en Configuración. Aunque apruebes este cliente, no
          verá funcionalidades PRO hasta que se reactive el interruptor global.
        </p>
      )}

      <label className="mt-3 flex cursor-pointer items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={optimista}
          disabled={isPending}
          onClick={handleToggle}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
            optimista ? "bg-bac-red" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              optimista ? "left-5" : "left-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-gray-700">Aprobar visibilidad PRO</span>
      </label>
      {esInterno && (
        <p className="mt-2 text-xs text-amber-700">Cliente interno BAC</p>
      )}
      <p className="mt-3 text-xs text-bac-gray-text">
        {optimista && proGlobalActivo
          ? "El cliente ve el botón PRO en su panel, el flujo de pago ($20/mes) y los botones de IA como placeholder."
          : "El cliente no ve ninguna funcionalidad PRO en su panel."}
      </p>
    </div>
  );
}
