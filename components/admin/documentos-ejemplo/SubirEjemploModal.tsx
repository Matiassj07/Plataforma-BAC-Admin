"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { subirDocumentoEjemplo } from "@/lib/admin/documentos-ejemplo-actions";

export function SubirEjemploModal({
  slug,
  nombre,
  onClose,
}: {
  slug: string;
  nombre: string;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await subirDocumentoEjemplo(slug, nombre, formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
      }
    });
  }

  return (
    <Modal title={`Subir ejemplo — ${nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-xs text-bac-gray-text">
          Este archivo estará disponible para que todos los clientes lo descarguen como plantilla.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
