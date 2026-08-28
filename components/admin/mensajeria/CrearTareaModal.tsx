"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { crearTarea } from "@/lib/admin/mensajeria-actions";
import { DateInput } from "@/components/DateInput";

export function CrearTareaModal({
  profileId,
  onClose,
  onCreated,
}: {
  profileId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState("media");
  const [fechaLimite, setFechaLimite] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setBusy(true);
    try {
      await crearTarea(profileId, titulo.trim(), descripcion.trim() || undefined, prioridad, fechaLimite || undefined);
      onCreated();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-bac-gray-border bg-white p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Nueva tarea</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Título *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-bac-red"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-bac-red resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-700">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-700">Fecha límite</label>
            <DateInput value={fechaLimite} onChange={setFechaLimite} className="mt-0.5 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !titulo.trim()}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Creando..." : "Crear tarea"}
          </button>
        </div>
      </form>
    </div>
  );
}
