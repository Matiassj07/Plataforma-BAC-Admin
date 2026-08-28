"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/admin/Modal";
import { actualizarCliente } from "@/lib/admin/actions";
import type { ClienteListItem } from "@/lib/admin/clientes";

const INPUT_CLASS =
  "w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function EditarClienteModal({
  cliente,
  onClose,
}: {
  cliente: ClienteListItem;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nombre_empresa: cliente.nombre_empresa,
    sector: cliente.sector ?? "",
    telefono: cliente.telefono ?? "",
    ruc: cliente.ruc ?? "",
    direccion: cliente.direccion ?? "",
    web: cliente.web ?? "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await actualizarCliente(cliente.id, {
          nombre_empresa: form.nombre_empresa,
          sector: form.sector || null,
          telefono: form.telefono || null,
          ruc: form.ruc || null,
          direccion: form.direccion || null,
          web: form.web || null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar los cambios.");
      }
    });
  }

  return (
    <Modal title={`Editar datos — ${cliente.nombre_empresa}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nombre de empresa</label>
          <input
            className={INPUT_CLASS}
            required
            value={form.nombre_empresa}
            onChange={(e) => setForm({ ...form, nombre_empresa: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Sector</label>
          <input
            className={INPUT_CLASS}
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">RUC</label>
            <input
              className={INPUT_CLASS}
              value={form.ruc}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Teléfono</label>
            <input
              className={INPUT_CLASS}
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Dirección</label>
          <input
            className={INPUT_CLASS}
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Sitio web</label>
          <input
            className={INPUT_CLASS}
            value={form.web}
            onChange={(e) => setForm({ ...form, web: e.target.value })}
          />
        </div>

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
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
