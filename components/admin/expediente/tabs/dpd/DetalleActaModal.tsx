"use client";

import { Modal } from "@/components/admin/Modal";
import { formatearFecha } from "@/lib/utils";
import type { DpdActa } from "@/lib/admin/dpd-types";

export function DetalleActaModal({ acta, onClose }: { acta: DpdActa; onClose: () => void }) {
  return (
    <Modal title={acta.numero_acta} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-bac-gray-text">Creada el {formatearFecha(acta.created_at)}</p>

        <div>
          <p className="text-xs font-semibold text-gray-900">Descripción del hallazgo</p>
          <p className="mt-1 text-gray-700">{acta.descripcion_hallazgo}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-900">Recomendación</p>
          <p className="mt-1 text-gray-700">{acta.recomendacion}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-900">Estado</p>
          <p className="mt-1 text-gray-700">
            {acta.estado === "pendiente_firma" && "Pendiente de firma del cliente"}
            {acta.estado === "firmada" && "Firmada por el cliente"}
            {acta.estado === "archivada" && "Archivada"}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
