"use client";

import { useState, useTransition } from "react";
import { Plus, Video, ExternalLink, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import type { Herramienta } from "@/lib/admin/herramientas";
import {
  crearHerramienta,
  actualizarHerramienta,
  eliminarHerramienta,
} from "@/lib/admin/herramientas";

type TipoHerramienta = "video" | "enlace";

interface FormState {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  url: string;
  tipo: TipoHerramienta;
}

const EMPTY_FORM: FormState = { titulo: "", subtitulo: "", descripcion: "", url: "", tipo: "enlace" };

export function HerramientasShell({ herramientas: initial }: { herramientas: Herramienta[] }) {
  const [items, setItems] = useState<Herramienta[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Herramienta | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pickingType, setPickingType] = useState(false);

  function openNew() {
    setPickingType(true);
  }

  function selectType(tipo: TipoHerramienta) {
    setPickingType(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM, tipo });
    setShowModal(true);
  }

  function openEdit(h: Herramienta) {
    setEditing(h);
    setForm({
      titulo: h.titulo,
      subtitulo: h.subtitulo ?? "",
      descripcion: h.descripcion ?? "",
      url: h.url,
      tipo: h.tipo,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.url.trim()) return;
    startTransition(async () => {
      if (editing) {
        const res = await actualizarHerramienta(editing.id, {
          titulo: form.titulo.trim(),
          subtitulo: form.subtitulo.trim() || undefined,
          descripcion: form.descripcion.trim() || undefined,
          url: form.url.trim(),
          tipo: form.tipo,
        });
        if (res.ok) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === editing.id
                ? { ...i, titulo: form.titulo.trim(), subtitulo: form.subtitulo.trim() || null, descripcion: form.descripcion.trim() || null, url: form.url.trim(), tipo: form.tipo }
                : i,
            ),
          );
        } else {
          alert(res.error ?? "Error al actualizar");
        }
      } else {
        const res = await crearHerramienta({
          titulo: form.titulo.trim(),
          subtitulo: form.subtitulo.trim() || undefined,
          descripcion: form.descripcion.trim() || undefined,
          url: form.url.trim(),
          tipo: form.tipo,
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert(res.error ?? "Error al crear");
        }
      }
      setShowModal(false);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta herramienta?")) return;
    startTransition(async () => {
      const res = await eliminarHerramienta(id);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert(res.error ?? "Error al eliminar");
      }
    });
  }

  function toggleActivo(h: Herramienta) {
    startTransition(async () => {
      const res = await actualizarHerramienta(h.id, { activo: !h.activo });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === h.id ? { ...i, activo: !i.activo } : i)));
      }
    });
  }

  return (
    <>
      {/* Type picker */}
      {pickingType && (
        <Modal title="¿Qué deseas agregar?" onClose={() => setPickingType(false)}>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => selectType("video")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-bac-gray-border p-6 hover:border-bac-red hover:bg-red-50 transition-colors"
            >
              <Video className="h-8 w-8 text-bac-red" />
              <span className="text-sm font-semibold text-gray-900">Video tutorial</span>
              <span className="text-xs text-bac-gray-text text-center">Link a YouTube, Vimeo u otro video</span>
            </button>
            <button
              onClick={() => selectType("enlace")}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-bac-gray-border p-6 hover:border-bac-red hover:bg-red-50 transition-colors"
            >
              <ExternalLink className="h-8 w-8 text-bac-red" />
              <span className="text-sm font-semibold text-gray-900">Enlace / Herramienta</span>
              <span className="text-xs text-bac-gray-text text-center">Link a una herramienta o recurso externo</span>
            </button>
          </div>
        </Modal>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <Modal
          title={editing ? "Editar herramienta" : `Nueva ${form.tipo === "video" ? "video tutorial" : "herramienta"}`}
          onClose={() => setShowModal(false)}
          widthClassName="max-w-lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-bac-gray-alt px-3 py-2 text-xs text-bac-gray-text">
              {form.tipo === "video" ? <Video className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              <span>Tipo: {form.tipo === "video" ? "Video tutorial" : "Enlace / Herramienta"}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ej: Cómo llenar el formulario RAT"
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:border-bac-red focus:ring-1 focus:ring-bac-red outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subtítulo</label>
              <input
                type="text"
                value={form.subtitulo}
                onChange={(e) => setForm((f) => ({ ...f, subtitulo: e.target.value }))}
                placeholder="Ej: Paso a paso para nuevos usuarios"
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:border-bac-red focus:ring-1 focus:ring-bac-red outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción detallada del recurso..."
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:border-bac-red focus:ring-1 focus:ring-bac-red outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder={form.tipo === "video" ? "https://youtube.com/watch?v=..." : "https://herramienta.com"}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:border-bac-red focus:ring-1 focus:ring-bac-red outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-bac-gray-border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !form.titulo.trim() || !form.url.trim()}
                className="rounded-lg bg-bac-red px-4 py-2 text-xs font-semibold text-white hover:bg-bac-red-dark disabled:opacity-50"
              >
                {isPending ? "Guardando..." : editing ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add button */}
      <button
        onClick={openNew}
        className="inline-flex items-center gap-2 rounded-lg bg-bac-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-bac-red-dark transition-colors"
      >
        <Plus className="h-4 w-4" />
        Agregar herramienta
      </button>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-bac-gray-border py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bac-gray-alt">
            <Plus className="h-6 w-6 text-bac-gray-text" />
          </div>
          <p className="text-sm font-medium text-gray-900">No hay herramientas todavía</p>
          <p className="mt-1 text-xs text-bac-gray-text">
            Agrega videos tutoriales o enlaces para que tus clientes los vean.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <div
              key={h.id}
              className={`group flex items-start gap-4 rounded-xl border bg-white p-5 transition-colors ${
                h.activo ? "border-bac-gray-border" : "border-dashed border-gray-300 opacity-60"
              }`}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bac-gray-alt">
                {h.tipo === "video" ? (
                  <Video className="h-5 w-5 text-bac-red" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{h.titulo}</h3>
                    {h.subtitulo && (
                      <p className="mt-0.5 text-xs font-medium text-bac-gray-text">{h.subtitulo}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    h.tipo === "video"
                      ? "bg-red-50 text-bac-red"
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    {h.tipo === "video" ? "Video" : "Enlace"}
                  </span>
                </div>

                {h.descripcion && (
                  <p className="mt-2 text-xs text-gray-600 leading-relaxed">{h.descripcion}</p>
                )}

                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-bac-red hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {h.url.length > 60 ? h.url.slice(0, 60) + "…" : h.url}
                </a>
              </div>

              <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleActivo(h)}
                  title={h.activo ? "Ocultar" : "Mostrar"}
                  className="rounded-lg p-1.5 text-bac-gray-text hover:bg-bac-gray-alt hover:text-gray-700"
                >
                  {h.activo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(h)}
                  title="Editar"
                  className="rounded-lg p-1.5 text-bac-gray-text hover:bg-bac-gray-alt hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(h.id)}
                  title="Eliminar"
                  className="rounded-lg p-1.5 text-bac-gray-text hover:bg-red-50 hover:text-bac-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
