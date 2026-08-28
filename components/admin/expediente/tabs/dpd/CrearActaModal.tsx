"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { crearActaDpd } from "@/lib/admin/dpd-actions";
import { MESES, type DpdActividad } from "@/lib/admin/dpd-types";

export function CrearActaModal({
  planId,
  clienteId,
  actividades,
  actividadPreseleccionada,
  onClose,
}: {
  planId: string;
  clienteId: string;
  actividades: DpdActividad[];
  actividadPreseleccionada: string | null;
  onClose: () => void;
}) {
  const [actividadId, setActividadId] = useState(actividadPreseleccionada ?? "");
  const [hallazgo, setHallazgo] = useState("");
  const [recomendacion, setRecomendacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    if (!hallazgo.trim() || !recomendacion.trim()) {
      setError("Completa la descripción del hallazgo y la recomendación.");
      return;
    }
    startTransition(async () => {
      try {
        await crearActaDpd(planId, clienteId, {
          actividad_id: actividadId || null,
          descripcion_hallazgo: hallazgo.trim(),
          recomendacion: recomendacion.trim(),
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el acta.");
      }
    });
  }

  return (
    <Modal title="Crear acta de no conformidad" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">
            Actividad relacionada (opcional)
          </label>
          <select
            value={actividadId}
            onChange={(e) => setActividadId(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          >
            <option value="">General (sin actividad específica)</option>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>
                {MESES[a.mes - 1]} — {a.fase}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">
            Descripción del hallazgo *
          </label>
          <textarea
            rows={3}
            value={hallazgo}
            onChange={(e) => setHallazgo(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">Recomendación *</label>
          <textarea
            rows={3}
            value={recomendacion}
            onChange={(e) => setRecomendacion(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
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
            {isPending ? "Creando..." : "Crear acta"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
