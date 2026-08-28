"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Download, Send, Trash2, CheckCircle2, Circle, FileText, Info, Plus, X } from "lucide-react";
import {
  subirActaEntrega,
  subirActaFirmada,
  actualizarEstadoImplementacion,
  enviarActaACliente,
  eliminarActaEntrega,
  obtenerUrlDescargaActa,
  type ActaEntrega,
} from "@/lib/admin/acta-entrega-actions";
import { useRouter } from "next/navigation";

const ESTADOS_DEFAULT = [
  { value: "activa", label: "Activa" },
  { value: "finalizada", label: "Finalizada" },
  { value: "finalizada_acta", label: "Finalizada por acta" },
  { value: "finalizada_interno", label: "Finalizada por interno" },
];

const INPUT_CLASS =
  "rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function ActaEntregaSection({
  clienteId,
  acta,
}: {
  clienteId: string;
  acta: ActaEntrega | null;
}) {
  const router = useRouter();
  const actaRef = useRef<HTMLInputElement>(null);
  const firmadaRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddEstado, setShowAddEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");

  const currentEstado = acta?.estado_implementacion ?? "activa";
  const isCustomEstado = !ESTADOS_DEFAULT.some((e) => e.value === currentEstado);

  function handleSubirActa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        await subirActaEntrega(clienteId, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir acta.");
      }
    });
    e.target.value = "";
  }

  function handleSubirFirmada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        await subirActaFirmada(clienteId, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir acta firmada.");
      }
    });
    e.target.value = "";
  }

  function handleDescargar(path: string) {
    startTransition(async () => {
      try {
        const url = await obtenerUrlDescargaActa(path);
        window.open(url, "_blank");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al descargar.");
      }
    });
  }

  function handleCambiarEstado(estado: string) {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarEstadoImplementacion(clienteId, estado);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cambiar estado.");
      }
    });
  }

  function handleAgregarEstado() {
    const val = nuevoEstado.trim();
    if (!val) return;
    setNuevoEstado("");
    setShowAddEstado(false);
    handleCambiarEstado(val);
  }

  function handleEliminarEstado() {
    handleCambiarEstado("activa");
  }

  function handleEnviar() {
    setError(null);
    startTransition(async () => {
      try {
        await enviarActaACliente(clienteId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar al cliente.");
      }
    });
  }

  function handleEliminar() {
    if (!confirm("¿Eliminar el acta de entrega y todos sus archivos?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarActaEntrega(clienteId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar.");
      }
    });
  }

  const isCompletada = acta?.completada || (currentEstado !== "activa");

  return (
    <div className="rounded-xl border border-bac-gray-border bg-white p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FileText className="h-4 w-4 text-bac-red" />
          Acta de entrega
        </h3>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-bac-gray-text hover:text-bac-red transition"
          title="Ver detalle"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showInfo && (
        <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <p className="font-medium mb-1">¿Qué es el acta de entrega?</p>
          <p className="mb-1">
            El acta de entrega es el documento final que certifica la implementación del sistema de protección de datos personales.
          </p>
          <ol className="list-decimal ml-4 space-y-0.5">
            <li>Sube el acta original generada por BAC.</li>
            <li>Envía el acta al cliente para que la revise y firme.</li>
            <li>El cliente descarga el acta, la firma y la sube de vuelta.</li>
            <li>Descarga el acta firmada para verificarla.</li>
            <li>Actualiza el estado de implementación según corresponda.</li>
          </ol>
        </div>
      )}

      {error && <p className="mb-3 text-xs text-bac-score-rojo">{error}</p>}

      <div className="space-y-3">
        {/* Estado de implementación */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Estado de implementación
          </label>
          <div className="flex items-center gap-2">
            <select
              className={INPUT_CLASS + " flex-1"}
              value={isCustomEstado ? "__custom__" : currentEstado}
              onChange={(e) => {
                if (e.target.value !== "__custom__") handleCambiarEstado(e.target.value);
              }}
              disabled={isPending}
            >
              {ESTADOS_DEFAULT.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
              {isCustomEstado && (
                <option value="__custom__">{currentEstado}</option>
              )}
            </select>
            {isCustomEstado && (
              <button
                onClick={handleEliminarEstado}
                disabled={isPending}
                className="p-1.5 rounded-lg border border-red-200 text-bac-score-rojo hover:bg-red-50 disabled:opacity-50"
                title="Eliminar estado personalizado"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowAddEstado(!showAddEstado)}
              disabled={isPending}
              className="p-1.5 rounded-lg border border-bac-gray-border text-gray-600 hover:bg-bac-gray-alt disabled:opacity-50"
              title="Agregar estado personalizado"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {showAddEstado && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAgregarEstado()}
                placeholder="Nombre del nuevo estado..."
                className={INPUT_CLASS + " flex-1"}
                autoFocus
              />
              <button
                onClick={handleAgregarEstado}
                disabled={isPending || !nuevoEstado.trim()}
                className="rounded-lg bg-bac-red px-3 py-2 text-xs font-medium text-white hover:bg-bac-red-dark disabled:opacity-50"
              >
                Agregar
              </button>
              <button
                onClick={() => { setShowAddEstado(false); setNuevoEstado(""); }}
                className="rounded-lg border border-bac-gray-border px-3 py-2 text-xs font-medium text-gray-600 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Completada indicator */}
        <div className="flex items-center gap-2 text-sm">
          {isCompletada ? (
            <CheckCircle2 className="h-4 w-4 text-bac-score-verde" />
          ) : (
            <Circle className="h-4 w-4 text-bac-gray-text" />
          )}
          <span className={isCompletada ? "text-bac-score-verde font-medium" : "text-bac-gray-text"}>
            {isCompletada ? "Implementación completada" : "Implementación pendiente"}
          </span>
        </div>

        {/* Acta original */}
        <div className="rounded-lg border border-bac-gray-border p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Acta original</p>
          <input ref={actaRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleSubirActa} />

          {acta?.url_acta ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-bac-score-verde font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Archivo subido
              </span>
              <button
                onClick={() => handleDescargar(acta.url_acta!)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
              >
                <Download className="h-3 w-3" /> Descargar
              </button>
              <button
                onClick={() => actaRef.current?.click()}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> Reemplazar
              </button>
            </div>
          ) : (
            <button
              onClick={() => actaRef.current?.click()}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red-dark disabled:opacity-50"
            >
              <Upload className="h-3 w-3" /> Subir acta
            </button>
          )}
        </div>

        {/* Acta firmada */}
        <div className="rounded-lg border border-bac-gray-border p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Acta firmada por el cliente</p>
          <input ref={firmadaRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleSubirFirmada} />

          {acta?.url_acta_firmada ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-bac-score-verde font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Firmada recibida
              </span>
              <button
                onClick={() => handleDescargar(acta.url_acta_firmada!)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
              >
                <Download className="h-3 w-3" /> Descargar
              </button>
              <button
                onClick={() => firmadaRef.current?.click()}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> Reemplazar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => firmadaRef.current?.click()}
                disabled={isPending || !acta?.url_acta}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
              >
                <Upload className="h-3 w-3" /> Subir firmada
              </button>
              {!acta?.url_acta && (
                <span className="text-xs text-bac-gray-text">Sube primero el acta original</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {acta?.url_acta && (
          <div className="flex items-center gap-2 pt-1 border-t border-bac-gray-border">
            {!acta.enviada_cliente ? (
              <button
                onClick={handleEnviar}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red-dark disabled:opacity-50"
              >
                <Send className="h-3 w-3" /> Enviar a cliente
              </button>
            ) : (
              <span className="text-xs text-bac-score-verde font-medium">✓ Enviada al cliente</span>
            )}

            <button
              onClick={handleEliminar}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-bac-score-rojo hover:bg-red-50 disabled:opacity-50 ml-auto"
            >
              <Trash2 className="h-3 w-3" /> Eliminar todo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
