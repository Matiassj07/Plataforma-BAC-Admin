"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { subirActaFirmada } from "@/lib/dpd-cliente-actions";

export function SubirActaFirmadaModal({ actaId, onClose }: { actaId: string; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo PDF.");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        await subirActaFirmada(actaId, formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo subir el acta.");
      }
    });
  }

  return (
    <Modal title="Subir acta firmada" onClose={onClose}>
      <div className="space-y-3">
        <input ref={fileRef} type="file" accept=".pdf" className="w-full text-sm" />
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
            {isPending ? "Subiendo..." : "Confirmar subida"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
