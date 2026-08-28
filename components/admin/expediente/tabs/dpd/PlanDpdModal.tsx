"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { DateInput } from "@/components/DateInput";
import { crearPlanDpd } from "@/lib/admin/dpd-actions";

export function PlanDpdModal({
  clienteId,
  modo,
  onClose,
}: {
  clienteId: string;
  modo: "subir" | "crear";
  onClose: () => void;
}) {
  const [nombreDpd, setNombreDpd] = useState("");
  const [correoDpd, setCorreoDpd] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    if (!nombreDpd.trim() || !correoDpd.trim() || !periodoInicio || !periodoFin) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    startTransition(async () => {
      try {
        const formData = new FormData();
        const file = fileRef.current?.files?.[0];
        if (file) formData.set("file", file);

        await crearPlanDpd(
          clienteId,
          { nombre_dpd: nombreDpd.trim(), correo_dpd: correoDpd.trim(), periodo_inicio: periodoInicio, periodo_fin: periodoFin },
          formData
        );
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el plan.");
      }
    });
  }

  return (
    <Modal
      title={modo === "subir" ? "Subir plan DPD existente" : "Crear plan DPD en la plataforma"}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">Nombre del DPD *</label>
          <input
            value={nombreDpd}
            onChange={(e) => setNombreDpd(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-900">Correo del DPD *</label>
          <input
            type="email"
            value={correoDpd}
            onChange={(e) => setCorreoDpd(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">Período — inicio *</label>
            <DateInput
              value={periodoInicio}
              onChange={setPeriodoInicio}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">Período — fin *</label>
            <DateInput
              value={periodoFin}
              onChange={setPeriodoFin}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
          </div>
        </div>

        {modo === "subir" && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-900">
              Archivo del plan (PDF o Word)
            </label>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="w-full text-sm" />
          </div>
        )}

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
            {isPending ? "Guardando..." : modo === "crear" ? "Guardar y continuar →" : "Guardar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
