"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { guardarIntegracionAlmacenamiento } from "@/lib/admin/almacenamiento-actions";
import type { IntegracionAlmacenamiento, ProveedorAlmacenamiento } from "@/lib/admin/almacenamiento";

const NOMBRES: Record<ProveedorAlmacenamiento, string> = {
  sharepoint: "SharePoint",
  onedrive: "OneDrive",
};

export function IntegracionModal({
  proveedorId,
  integracion,
  onClose,
  onSaved,
}: {
  proveedorId: ProveedorAlmacenamiento;
  integracion?: IntegracionAlmacenamiento;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [carpetaDestino, setCarpetaDestino] = useState(integracion?.carpeta_destino || "");
  const [syncAutomatica, setSyncAutomatica] = useState(integracion?.sync_automatica ?? false);
  const [activo, setActivo] = useState(integracion?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const yaConectado = !!integracion?.access_token;

  function iniciarOAuth() {
    const params = new URLSearchParams({
      proveedor: proveedorId,
      carpeta: carpetaDestino.trim(),
    });
    window.location.href = `/api/auth/connect?${params}`;
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        await guardarIntegracionAlmacenamiento({
          id: integracion?.id,
          proveedor: proveedorId,
          carpeta_destino: carpetaDestino.trim(),
          sync_automatica: syncAutomatica,
          activo,
        });
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  return (
    <Modal title={`Configurar ${NOMBRES[proveedorId]}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">Carpeta destino</label>
          <input
            type="text"
            value={carpetaDestino}
            onChange={(e) => setCarpetaDestino(e.target.value)}
            placeholder="/BAC/Clientes"
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
          <p className="mt-1 text-xs text-bac-gray-text">
            Ruta donde se guardarán los documentos sincronizados de los clientes.
          </p>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={syncAutomatica}
            onChange={(e) => setSyncAutomatica(e.target.checked)}
            className="rounded border-bac-gray-border"
          />
          <span className="text-sm text-gray-900">Sincronización automática</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="rounded border-bac-gray-border"
          />
          <span className="text-sm text-gray-900">Conexión activa</span>
        </label>

        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 border-t border-bac-gray-border pt-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cancelar
          </button>
          {yaConectado ? (
            <button
              onClick={guardar}
              disabled={isPending}
              className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
            >
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          ) : (
            <button
              onClick={iniciarOAuth}
              className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
            >
              Conectar con {NOMBRES[proveedorId]}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
