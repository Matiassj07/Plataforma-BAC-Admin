"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp, Plus, GripVertical } from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import { toggleChecklistItem, agregarChecklistItem, eliminarChecklistItem, eliminarTarea, actualizarTarea } from "@/lib/admin/mensajeria-actions";

interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
  orden: number;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: string;
  fecha_limite: string | null;
  created_at: string;
  mensajeria_checklist: ChecklistItem[];
}

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baja: "bg-green-100 text-green-700",
};

export function TarjetaTarea({ tarea, onRefresh }: { tarea: Tarea; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [nuevoItem, setNuevoItem] = useState("");
  const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editTitulo, setEditTitulo] = useState(tarea.titulo);
  const [editDesc, setEditDesc] = useState(tarea.descripcion ?? "");

  const checklist = [...(tarea.mensajeria_checklist ?? [])].sort((a, b) => a.orden - b.orden);
  const completados = checklist.filter((c) => c.completado).length;

  async function handleToggle(itemId: string, val: boolean) {
    setBusy(true);
    try { await toggleChecklistItem(itemId, val); onRefresh(); } finally { setBusy(false); }
  }

  async function handleAddItem() {
    if (!nuevoItem.trim()) return;
    setBusy(true);
    try { await agregarChecklistItem(tarea.id, nuevoItem.trim()); setNuevoItem(""); onRefresh(); } finally { setBusy(false); }
  }

  async function handleDeleteItem(itemId: string) {
    setBusy(true);
    try { await eliminarChecklistItem(itemId); onRefresh(); } finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setBusy(true);
    try { await eliminarTarea(tarea.id); onRefresh(); } finally { setBusy(false); }
  }

  async function handleSaveEdit() {
    setBusy(true);
    try {
      await actualizarTarea(tarea.id, { titulo: editTitulo, descripcion: editDesc || null });
      setEditando(false);
      onRefresh();
    } finally { setBusy(false); }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("tareaId", tarea.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="rounded-lg border border-bac-gray-border bg-white p-3 shadow-sm hover:shadow transition cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0" />
          {editando ? (
            <input
              value={editTitulo}
              onChange={(e) => setEditTitulo(e.target.value)}
              className="flex-1 text-sm font-medium border-b border-bac-gray-border outline-none"
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-medium text-gray-900 truncate cursor-pointer"
              onDoubleClick={() => setEditando(true)}
            >
              {tarea.titulo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORIDAD_COLORS[tarea.prioridad] ?? "bg-gray-100 text-gray-600"}`}>
            {tarea.prioridad}
          </span>
          <button onClick={handleDelete} className="p-0.5 text-gray-400 hover:text-red-500" disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editando ? (
        <div className="mt-2 space-y-1">
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="w-full text-xs border border-bac-gray-border rounded p-1.5 outline-none resize-none"
            rows={2}
            placeholder="Descripción..."
          />
          <div className="flex gap-1">
            <button onClick={handleSaveEdit} disabled={busy} className="text-[10px] bg-bac-red text-white px-2 py-0.5 rounded">
              Guardar
            </button>
            <button onClick={() => setEditando(false)} className="text-[10px] text-gray-500 px-2 py-0.5">
              Cancelar
            </button>
          </div>
        </div>
      ) : tarea.descripcion ? (
        <p className="mt-1 text-xs text-bac-gray-text line-clamp-2">{tarea.descripcion}</p>
      ) : null}

      {tarea.fecha_limite && (
        <p className="mt-1 text-[10px] text-bac-gray-text">
          Límite: {formatearFecha(tarea.fecha_limite)}
        </p>
      )}

      {checklist.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-bac-gray-text hover:text-gray-700"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Checklist ({completados}/{checklist.length})
          </button>
          {expanded && (
            <div className="mt-1 space-y-1">
              {checklist.map((item) => (
                <label key={item.id} className="flex items-center gap-1.5 text-xs group">
                  <input
                    type="checkbox"
                    checked={item.completado}
                    onChange={(e) => handleToggle(item.id, e.target.checked)}
                    disabled={busy}
                    className="accent-bac-red"
                  />
                  <span className={item.completado ? "line-through text-gray-400" : "text-gray-700"}>
                    {item.texto}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                    disabled={busy}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-1.5 flex gap-1">
          <input
            value={nuevoItem}
            onChange={(e) => setNuevoItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            placeholder="Nuevo item..."
            className="flex-1 text-xs border border-bac-gray-border rounded px-2 py-1 outline-none"
          />
          <button onClick={handleAddItem} disabled={busy || !nuevoItem.trim()} className="text-bac-red disabled:text-gray-300">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
