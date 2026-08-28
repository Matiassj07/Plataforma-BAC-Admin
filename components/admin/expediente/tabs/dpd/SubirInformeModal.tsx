"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { subirInformeActividad } from "@/lib/admin/dpd-actions";

export function SubirInformeModal({
  actividadId,
  clienteId,
  onClose,
}: {
  actividadId: string;
  clienteId: string;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo.");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        await subirInformeActividad(actividadId, clienteId, formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo subir el informe.");
      }
    });
  }

  return (
    <Modal title="Subir informe mensual" onClose={onClose}>
      <div className="space-y-3">
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="w-full text-sm" />
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Subiendo..." : "Subir informe"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
