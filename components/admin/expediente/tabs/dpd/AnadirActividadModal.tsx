"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { crearActividadDpd } from "@/lib/admin/dpd-actions";
import { MESES } from "@/lib/admin/dpd-types";

export function AnadirActividadModal({
  planId,
  clienteId,
  onClose,
}: {
  planId: string;
  clienteId: string;
  onClose: () => void;
}) {
  const [mes, setMes] = useState(1);
  const [fase, setFase] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [verificacion, setVerificacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    if (!fase.trim() || !descripcion.trim()) {
      setError("Completa la fase y la descripción de la actividad.");
      return;
    }
    startTransition(async () => {
      try {
        await crearActividadDpd(planId, clienteId, {
          mes,
          fase: fase.trim(),
          descripcion: descripcion.trim(),
          verificacion: verificacion.trim(),
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la actividad.");
      }
    });
  }

  return (
    <Modal title="Añadir actividad" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">Fase</label>
            <input
              value={fase}
              onChange={(e) => setFase(e.target.value)}
              placeholder="Fase I"
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">
            Descripción de la actividad *
          </label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">
            Verificación (cómo se comprueba que se realizó)
          </label>
          <textarea
            rows={2}
            value={verificacion}
            onChange={(e) => setVerificacion(e.target.value)}
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
            {isPending ? "Guardando..." : "Guardar actividad"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
