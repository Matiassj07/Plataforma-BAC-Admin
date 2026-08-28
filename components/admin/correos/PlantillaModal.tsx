"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { guardarPlantillaCorreo } from "@/lib/admin/correos-actions";
import { RichTextEditor } from "@/components/admin/shared/RichTextEditor";
import type { PlantillaCorreo } from "@/lib/admin/correos";

export function PlantillaModal({
  plantilla,
  onClose,
}: {
  plantilla?: PlantillaCorreo;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState(plantilla?.tipo || "");
  const [asunto, setAsunto] = useState(plantilla?.asunto || "");
  const [cuerpo, setCuerpo] = useState(plantilla?.cuerpo || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    if (!tipo.trim() || !asunto.trim() || !cuerpo.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    startTransition(async () => {
      try {
        await guardarPlantillaCorreo(plantilla?.id, {
          tipo: tipo.trim().toLowerCase().replace(/\s+/g, "-"),
          asunto: asunto.trim(),
          cuerpo: cuerpo.trim(),
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  return (
    <Modal title={plantilla ? "Editar plantilla" : "Nueva plantilla"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Tipo</label>
          <input
            type="text"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="ej. bienvenida"
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Asunto</label>
          <input
            type="text"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Bienvenido a BAC"
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-900 mb-1">Cuerpo</label>
          <RichTextEditor
            value={cuerpo}
            onChange={setCuerpo}
            placeholder="Escribe el contenido de la plantilla..."
            minHeight="150px"
          />
          <p className="mt-1 text-xs text-bac-gray-text">
            Usa {"{{variable}}"} para variables dinámicas.
          </p>
        </div>

        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
