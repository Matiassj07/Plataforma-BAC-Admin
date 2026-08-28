"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { DateInput } from "@/components/DateInput";
import { marcarActividadCompletada } from "@/lib/admin/dpd-actions";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MarcarCompletadaModal({
  actividadId,
  clienteId,
  onClose,
}: {
  actividadId: string;
  clienteId: string;
  onClose: () => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    if (!fecha) {
      setError("Selecciona la fecha de realización.");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        const file = fileRef.current?.files?.[0];
        if (file) formData.set("file", file);

        await marcarActividadCompletada(
          actividadId,
          clienteId,
          { fecha_completado: fecha, observaciones },
          formData
        );
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo marcar la actividad.");
      }
    });
  }

  return (
    <Modal title="Marcar actividad como completada" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">Fecha de realización</label>
          <DateInput
            value={fecha}
            onChange={setFecha}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">
            Observaciones del DPD (opcional)
          </label>
          <textarea
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">
            Informe mensual (opcional, .pdf/.docx)
          </label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="w-full text-sm" />
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
            onClick={confirmar}
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
