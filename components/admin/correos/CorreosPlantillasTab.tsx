"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import type { PlantillaCorreo } from "@/lib/admin/correos";
import { eliminarPlantillaCorreo } from "@/lib/admin/correos-actions";
import { PlantillaModal } from "./PlantillaModal";

export function CorreosPlantillasTab({
  plantillas: initialPlantillas,
  onPlantillasUpdated,
}: {
  plantillas: PlantillaCorreo[];
  onPlantillasUpdated?: (plantillas: PlantillaCorreo[]) => void;
}) {
  const [plantillas, setPlantillas] = useState(initialPlantillas);
  const [editando, setEditando] = useState<PlantillaCorreo | null>(null);
  const [creando, setCreando] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refrescarPlantillas() {
    const freshRes = await fetch("/admin/api/get-plantillas-correos");
    const freshData = await freshRes.json();
    if (freshRes.ok && freshData.plantillas) {
      setPlantillas(freshData.plantillas);
      onPlantillasUpdated?.(freshData.plantillas);
    }
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar esta plantilla?")) return;
    startTransition(async () => {
      try {
        await eliminarPlantillaCorreo(id);
        await refrescarPlantillas();
      } catch (err) {
        setTemplateError(err instanceof Error ? err.message : "Error al eliminar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setCreando(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-bac-red px-4 py-2 text-sm font-semibold text-white hover:bg-bac-red-dark"
      >
        <Plus className="h-4 w-4" />
        Nueva plantilla
      </button>

      {templateError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-bac-score-rojo">
          {templateError}
        </div>
      )}

      <div className="divide-y divide-bac-gray-border rounded-lg border border-bac-gray-border bg-white">
        {plantillas.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-bac-gray-text">Sin plantillas configuradas. Crea una con el botón "Nueva plantilla".</p>
          </div>
        ) : (
          plantillas.map((plantilla) => (
            <div key={plantilla.id} className="flex items-center justify-between px-4 py-3 hover:bg-bac-gray-alt/40">
              <div>
                <p className="text-sm font-medium text-gray-900">{plantilla.asunto}</p>
                <p className="text-xs text-bac-gray-text">{plantilla.tipo}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setEditando(plantilla)}
                  className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => eliminar(plantilla.id)}
                  className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-bac-score-rojo hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editando && (
        <PlantillaModal
          plantilla={editando}
          onClose={() => {
            setEditando(null);
            refrescarPlantillas();
          }}
        />
      )}
      {creando && (
        <PlantillaModal
          onClose={() => {
            setCreando(false);
            refrescarPlantillas();
          }}
        />
      )}
    </div>
  );
}
