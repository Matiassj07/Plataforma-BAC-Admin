"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import { getTareasPorCliente, moverTarea, getClientesParaMensajeria } from "@/lib/admin/mensajeria-actions";
import { TarjetaTarea } from "./TarjetaTarea";
import { CrearTareaModal } from "./CrearTareaModal";

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

interface Cliente {
  id: string;
  nombre_empresa: string;
}

const COLUMNAS = [
  { key: "pendiente", label: "Pendiente", color: "border-t-yellow-400" },
  { key: "en_progreso", label: "En Progreso", color: "border-t-blue-400" },
  { key: "completada", label: "Completada", color: "border-t-green-400" },
];

export function TableroKanban({
  clientesInicial,
}: {
  clientesInicial: Cliente[];
}) {
  const [clientes] = useState(clientesInicial);
  const [selectedClient, setSelectedClient] = useState(clientes[0]?.id ?? "");
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const fetchTareas = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const data = await getTareasPorCliente(selectedClient);
      setTareas(data);
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    fetchTareas();
  }, [fetchTareas]);

  async function handleDrop(e: React.DragEvent, nuevoEstado: string) {
    e.preventDefault();
    setDragOverCol(null);
    const tareaId = e.dataTransfer.getData("tareaId");
    if (!tareaId) return;
    const tarea = tareas.find((t) => t.id === tareaId);
    if (!tarea || tarea.estado === nuevoEstado) return;
    setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, estado: nuevoEstado } : t)));
    await moverTarea(tareaId, nuevoEstado);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Cliente:</label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre_empresa}
              </option>
            ))}
          </select>
        </div>
        {selectedClient && (
          <button
            onClick={() => setShowCrear(true)}
            className="flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Nueva tarea
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-bac-gray-text py-12">Cargando tareas...</p>
      ) : !selectedClient ? (
        <p className="text-center text-sm text-bac-gray-text py-12">Selecciona un cliente</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNAS.map((col) => {
            const tareasCol = tareas.filter((t) => t.estado === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`rounded-xl border-t-4 ${col.color} bg-gray-50 p-3 min-h-[400px] transition ${
                  dragOverCol === col.key ? "bg-blue-50/50 ring-2 ring-blue-200" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs text-bac-gray-text bg-white rounded-full px-2 py-0.5">
                    {tareasCol.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tareasCol.map((t) => (
                    <TarjetaTarea key={t.id} tarea={t} onRefresh={fetchTareas} />
                  ))}
                  {tareasCol.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-8">Sin tareas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCrear && selectedClient && (
        <CrearTareaModal
          profileId={selectedClient}
          onClose={() => setShowCrear(false)}
          onCreated={fetchTareas}
        />
      )}
    </div>
  );
}
