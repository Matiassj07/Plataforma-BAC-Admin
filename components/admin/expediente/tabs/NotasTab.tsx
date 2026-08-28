"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { formatearFecha, cn } from "@/lib/utils";
import { actualizarVisibilidadNota, crearNotaInterna, eliminarNotaInterna } from "@/lib/admin/expediente-actions";
import type { NotaInternaItem } from "@/lib/admin/expediente";

export function NotasTab({ clienteId, notas }: { clienteId: string; notas: NotaInternaItem[] }) {
  const [contenido, setContenido] = useState("");
  const [visibleCliente, setVisibleCliente] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await crearNotaInterna(clienteId, contenido.trim(), visibleCliente);
        setContenido("");
        setVisibleCliente(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la nota.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Por defecto estas notas nunca son visibles para el cliente. Puedes marcar una nota
        individual como visible si quieres compartirla.
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={3}
          placeholder="Escribe una nota interna..."
          className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red"
        />
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setVisibleCliente((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
              visibleCliente
                ? "border-bac-score-verde bg-green-50 text-bac-score-verde"
                : "border-bac-gray-border text-bac-gray-text hover:bg-bac-gray-alt"
            )}
          >
            {visibleCliente ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {visibleCliente ? "Visible para el cliente" : "Solo interna"}
          </button>
          <button
            type="submit"
            disabled={isPending || !contenido.trim()}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "+ Añadir nota"}
          </button>
        </div>
      </form>

      {notas.length === 0 ? (
        <p className="text-sm text-bac-gray-text">Sin notas internas registradas.</p>
      ) : (
        <ul className="space-y-2">
          {notas.map((n) => (
            <NotaRow key={n.id} nota={n} clienteId={clienteId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotaRow({ nota, clienteId }: { nota: NotaInternaItem; clienteId: string }) {
  const [visible, setVisible] = useState(nota.visible_cliente);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const nuevo = !visible;
    setVisible(nuevo);
    startTransition(async () => {
      try {
        await actualizarVisibilidadNota(nota.id, clienteId, nuevo);
      } catch {
        setVisible(!nuevo);
      }
    });
  }

  function handleEliminar() {
    if (!confirm("¿Eliminar esta nota?")) return;
    startTransition(async () => {
      await eliminarNotaInterna(nota.id, clienteId);
    });
  }

  return (
    <li className="rounded-lg border border-bac-gray-border bg-white p-3 text-sm">
      <div className="mb-1 flex items-center justify-between text-xs text-bac-gray-text">
        <span className="font-medium text-gray-700">{nota.autor}</span>
        <span>{formatearFecha(nota.created_at)}</span>
      </div>
      <p className="text-gray-800">{nota.contenido}</p>
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={handleEliminar}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-lg border border-bac-gray-border px-2.5 py-1 text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
        >
          <Trash2 className="h-3 w-3" /> Eliminar
        </button>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-60",
            visible
              ? "border-bac-score-verde bg-green-50 text-bac-score-verde"
              : "border-bac-gray-border text-bac-gray-text hover:bg-bac-gray-alt"
          )}
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {visible ? "Visible para el cliente" : "Solo interna"}
        </button>
      </div>
    </li>
  );
}
