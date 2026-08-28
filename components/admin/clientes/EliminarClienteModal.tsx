"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { eliminarCliente } from "@/lib/admin/actions";
import type { ClienteListItem } from "@/lib/admin/clientes";

export function EliminarClienteModal({
  cliente,
  onClose,
}: {
  cliente: ClienteListItem;
  onClose: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [confirmacion, setConfirmacion] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nombreCoincide =
    confirmacion.trim().toLowerCase() === (cliente.nombre_empresa ?? "").trim().toLowerCase();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await eliminarCliente(cliente.id);
        if (result.ok) {
          onClose();
        } else {
          setError(result.error || "No se pudo eliminar el cliente.");
        }
      } catch {
        setError("No se pudo eliminar el cliente. Intenta de nuevo.");
      }
    });
  }

  return (
    <Modal title="Eliminar cliente" onClose={onClose}>
      {paso === 1 ? (
        <div className="space-y-4 text-sm">
          <p className="text-gray-700">
            Estás a punto de eliminar permanentemente a{" "}
            <span className="font-medium">{cliente.nombre_empresa}</span> y todos sus datos (RAT,
            riesgos, documentos, personal, historial). Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              Cancelar
            </button>
            <button
              onClick={() => setPaso(2)}
              className="rounded-lg bg-bac-score-rojo px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Continuar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-gray-700">
            Para confirmar, escribe el nombre exacto de la empresa:{" "}
            <span className="font-semibold">{cliente.nombre_empresa}</span>
          </p>
          <input
            autoFocus
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-score-rojo focus:ring-1 focus:ring-bac-score-rojo"
            placeholder={cliente.nombre_empresa}
          />
          {error && <p className="text-bac-score-rojo">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={!nombreCoincide || isPending}
              className="rounded-lg bg-bac-score-rojo px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {isPending ? "Eliminando..." : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
