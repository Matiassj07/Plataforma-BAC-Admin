"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import { formatearFecha, diasDesde } from "@/lib/utils";
import { DateInput } from "@/components/DateInput";
import { analizarBrechasConIA } from "@/lib/admin/ia-actions";
import { cambiarEstadoBrecha, crearBrechaAdmin, eliminarBrecha } from "@/lib/admin/expediente-actions";
import { BotonAnalisisIA, ConfirmacionIAModal, ResultadoIAPlanModal } from "./AnalisisIAModal";
import type { BrechaSeguridadItem } from "@/lib/admin/expediente";

const ESTADO_COLOR: Record<string, string> = {
  abierta: "bg-red-100 text-bac-score-rojo",
  contenida: "bg-amber-100 text-bac-score-amarillo",
  cerrada: "bg-green-100 text-bac-score-verde",
};

export function BrechasTab({ brechas, clienteId }: { brechas: BrechaSeguridadItem[]; clienteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [formData, setFormData] = useState({ tipo_incidente: "", descripcion: "", datos_afectados: "", fecha_deteccion: "" });
  const [formError, setFormError] = useState("");
  const [mostrarConfirmIA, setMostrarConfirmIA] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [resultadoPlan, setResultadoPlan] = useState<{
    plan: any[];
    resumen: string;
    totalAcciones: number;
    plazoTotal: number | null;
    costo: string;
  } | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  async function handleConfirmarIA() {
    setAnalizando(true);
    setErrorIA(null);
    try {
      const res = await analizarBrechasConIA(clienteId);
      setMostrarConfirmIA(false);
      setResultadoPlan(res);
    } catch (e: any) {
      setMostrarConfirmIA(false);
      setErrorIA(e.message ?? "Error al generar plan de acción");
    } finally {
      setAnalizando(false);
    }
  }

  async function handleCrearBrecha() {
    if (!formData.tipo_incidente.trim()) { setFormError("El tipo de incidente es obligatorio"); return; }
    if (!formData.descripcion.trim()) { setFormError("La descripción es obligatoria"); return; }
    if (!formData.fecha_deteccion) { setFormError("La fecha de detección es obligatoria"); return; }
    setFormError("");
    startTransition(async () => {
      try {
        await crearBrechaAdmin(clienteId, formData);
        setMostrarCrear(false);
        setFormData({ tipo_incidente: "", descripcion: "", datos_afectados: "", fecha_deteccion: "" });
        router.refresh();
      } catch (e: any) {
        setFormError(e.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {brechas.length} brecha{brechas.length !== 1 ? "s" : ""} registrada{brechas.length !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          {brechas.length > 0 && (
            <BotonAnalisisIA tipo="brechas" onClick={() => setMostrarConfirmIA(true)} />
          )}
          <button
            onClick={() => setMostrarCrear(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red-dark"
          >
            <Plus className="h-3.5 w-3.5" /> Crear brecha
          </button>
        </div>
      </div>

      {errorIA && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorIA}
        </div>
      )}

      {brechas.length === 0 ? (
        <p className="text-sm text-bac-gray-text">
          Sin brechas de seguridad registradas para este cliente.
        </p>
      ) : (
        <div className="rounded-xl border border-bac-gray-border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-bac-gray-border bg-bac-gray-alt text-xs font-medium uppercase tracking-wide text-bac-gray-text">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">¿Notificar a SPDP?</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tiempo</th>
                <th className="px-4 py-3">Acciones</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {brechas.map((b) => {
                const dias = diasDesde(b.fecha_deteccion);
                return (
                  <tr key={b.id} className="border-b border-bac-gray-border last:border-0">
                    <td className="px-4 py-3 text-gray-800">{b.tipo_incidente ?? "—"}</td>
                    <td className="px-4 py-3 text-bac-gray-text">{formatearFecha(b.fecha_deteccion)}</td>
                    <td className="px-4 py-3">
                      {b.obliga_notificar ? (
                        <span className="text-bac-score-rojo">Sí ({b.articulo_base ?? "LOPDP"})</span>
                      ) : (
                        <span className="text-bac-gray-text">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          ESTADO_COLOR[b.estado ?? ""] ?? "bg-bac-gray-alt text-bac-gray-text"
                        }`}
                      >
                        {b.estado ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bac-gray-text">
                      {dias === null ? "—" : `hace ${dias} día${dias !== 1 ? "s" : ""}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {b.estado !== "abierta" && (
                          <button
                            disabled={isPending}
                            onClick={() =>
                              startTransition(() => cambiarEstadoBrecha(b.id, clienteId, "abierta"))
                            }
                            className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Reabrir
                          </button>
                        )}
                        {b.estado !== "contenida" && (
                          <button
                            disabled={isPending}
                            onClick={() =>
                              startTransition(() => cambiarEstadoBrecha(b.id, clienteId, "contenida"))
                            }
                            className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Contener
                          </button>
                        )}
                        {b.estado !== "cerrada" && (
                          <button
                            disabled={isPending}
                            onClick={() =>
                              startTransition(() => cambiarEstadoBrecha(b.id, clienteId, "cerrada"))
                            }
                            className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            Cerrar
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => {
                          if (!confirm("¿Eliminar esta brecha?")) return;
                          startTransition(() => eliminarBrecha(b.id, clienteId));
                        }}
                        disabled={isPending}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Eliminar brecha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {mostrarCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Crear brecha de seguridad</h3>
              <button onClick={() => setMostrarCrear(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {formError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{formError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-bac-gray-text">Tipo de incidente *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                  value={formData.tipo_incidente}
                  onChange={(e) => setFormData({ ...formData, tipo_incidente: e.target.value })}
                  placeholder="Ej: Acceso no autorizado"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-bac-gray-text">Descripción *</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-bac-gray-text">Datos afectados</label>
                <input
                  className="mt-1 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                  value={formData.datos_afectados}
                  onChange={(e) => setFormData({ ...formData, datos_afectados: e.target.value })}
                  placeholder="Ej: Datos personales de clientes"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-bac-gray-text">Fecha de detección *</label>
                <DateInput
                  value={formData.fecha_deteccion}
                  onChange={(v) => setFormData({ ...formData, fecha_deteccion: v })}
                  className="mt-1 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setMostrarCrear(false)}
                className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearBrecha}
                disabled={isPending}
                className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
              >
                {isPending ? "Guardando..." : "Crear brecha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarConfirmIA && (
        <ConfirmacionIAModal
          tipo="brechas"
          analizando={analizando}
          onConfirmar={handleConfirmarIA}
          onClose={() => { if (!analizando) setMostrarConfirmIA(false); }}
        />
      )}

      {resultadoPlan && (
        <ResultadoIAPlanModal
          plan={resultadoPlan.plan}
          resumen={resultadoPlan.resumen}
          totalAcciones={resultadoPlan.totalAcciones}
          plazoTotal={resultadoPlan.plazoTotal}
          onClose={() => setResultadoPlan(null)}
        />
      )}
    </div>
  );
}
