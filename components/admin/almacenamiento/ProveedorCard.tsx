"use client";

import { useTransition } from "react";
import { Settings, RefreshCw, Unplug, CheckCircle2, XCircle } from "lucide-react";
import type { IntegracionAlmacenamiento, ProveedorAlmacenamiento } from "@/lib/admin/almacenamiento";
import { desconectarAlmacenamiento, sincronizarAlmacenamiento } from "@/lib/admin/almacenamiento-actions";
import { formatearFecha } from "@/lib/utils";

export function ProveedorCard({
  proveedorId,
  nombre,
  Icon,
  integracion,
  onConfigurar,
  onRefrescar,
}: {
  proveedorId: ProveedorAlmacenamiento;
  nombre: string;
  Icon: React.ComponentType<{ className?: string }>;
  integracion: IntegracionAlmacenamiento | null;
  onConfigurar: () => void;
  onRefrescar: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const conectado = !!integracion && integracion.activo;

  function sincronizar() {
    if (!integracion) return;
    startTransition(async () => {
      try {
        const result = await sincronizarAlmacenamiento(integracion.id);
        if (result) {
          const parts: string[] = [];
          if (result.sincronizados > 0) parts.push(`${result.sincronizados} subido(s)`);
          if ((result as any).descargados > 0) parts.push(`${(result as any).descargados} descargado(s) desde la nube`);
          const errTotal = (result.errores || 0) + ((result as any).erroresPull || 0);
          if (errTotal > 0) parts.push(`${errTotal} error(es)`);
          if (parts.length === 0) parts.push("todo al día, sin cambios");
          alert(`Sincronización completada: ${parts.join(", ")}.`);
        }
        onRefrescar();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error al sincronizar.");
      }
    });
  }

  function desconectar() {
    if (!integracion) return;
    if (!confirm(`¿Desconectar ${nombre}?`)) return;
    startTransition(async () => {
      await desconectarAlmacenamiento(integracion.id);
      onRefrescar();
    });
  }

  return (
    <div className="rounded-xl border border-bac-gray-border bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bac-gray-alt">
            <Icon className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{nombre}</p>
            <div className="flex items-center gap-1 text-xs">
              {conectado ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-bac-score-verde" />
                  <span className="text-bac-score-verde">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-bac-gray-text" />
                  <span className="text-bac-gray-text">No conectado</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {integracion && (
        <div className="mt-3 space-y-1 text-xs text-bac-gray-text">
          <p>
            Carpeta destino: <span className="text-gray-900">{integracion.carpeta_destino || "—"}</span>
          </p>
          <p>Sincronización automática: {integracion.sync_automatica ? "Activada" : "Desactivada"}</p>
          <p>Última sincronización: {integracion.ultima_sync ? formatearFecha(integracion.ultima_sync) : "Nunca"}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={onConfigurar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          <Settings className="h-3.5 w-3.5" />
          {integracion ? "Editar" : "Conectar"}
        </button>
        {integracion && (
          <>
            <button
              onClick={sincronizar}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar
            </button>
            <button
              onClick={desconectar}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-bac-score-rojo hover:bg-red-50 disabled:opacity-60"
            >
              <Unplug className="h-3.5 w-3.5" />
              Desconectar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
