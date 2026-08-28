"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { setSuspendido } from "@/lib/admin/actions";
import type { ClienteListItem } from "@/lib/admin/clientes";

export function SuspenderClienteModal({
  cliente,
  onClose,
}: {
  cliente: ClienteListItem;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const accion = cliente.suspendido ? "reactivar" : "suspender";

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await setSuspendido(cliente.id, !cliente.suspendido);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
      }
    });
  }

  return (
    <Modal title={cliente.suspendido ? "Reactivar cuenta" : "Suspender cuenta"} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-gray-700">
          ¿Confirmas que deseas {accion} la cuenta de{" "}
          <span className="font-medium">{cliente.nombre_empresa}</span>?
          {!cliente.suspendido && " El cliente no podrá acceder a la plataforma mientras esté suspendida."}
        </p>
        {error && <p className="text-bac-score-rojo">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Procesando..." : `Sí, ${accion}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
