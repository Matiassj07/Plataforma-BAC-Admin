"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert, Trash2, Download, X, Pencil, Eye, AlertTriangle } from "lucide-react";
import { crearInformeBrecha, eliminarInformeBrecha, editarInformeBrecha } from "@/lib/admin/dpd-actions";
import { cambiarEstadoBrecha, editarBrecha, eliminarBrecha } from "@/lib/admin/expediente-actions";
import { formatearFecha } from "@/lib/utils";
import { MESES } from "@/lib/admin/dpd-types";
import type { DpdInformeBrecha } from "@/lib/admin/dpd-types";
import type { BrechaSeguridadItem } from "@/lib/admin/expediente";

function diasParaAutoEliminar(createdAt: string): number | null {
  const created = new Date(createdAt).getTime();
  const limite = created + 5 * 24 * 60 * 60 * 1000;
  const restante = limite - Date.now();
  if (restante <= 0) return 0;
  return Math.ceil(restante / (24 * 60 * 60 * 1000));
}

export function BrechasSeguridad({
  planId,
  clienteId,
  informes,
  brechasSeguridad,
}: {
  planId: string;
  clienteId: string;
  informes: DpdInformeBrecha[];
  brechasSeguridad: BrechaSeguridadItem[];
}) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [detalleInforme, setDetalleInforme] = useState<DpdInformeBrecha | null>(null);
  const [editandoInforme, setEditandoInforme] = useState<DpdInformeBrecha | null>(null);
  const [editandoBrecha, setEditandoBrecha] = useState<BrechaSeguridadItem | null>(null);

  const porAnio = informes.reduce<Record<number, DpdInformeBrecha[]>>((acc, inf) => {
    (acc[inf.anio] ??= []).push(inf);
    return acc;
  }, {});
  const anios = Object.keys(porAnio).map(Number).sort((a, b) => b - a);

  function handleEliminar(informeId: string) {
    if (!confirm("¿Eliminar este informe de brechas?")) return;
    startTransition(async () => {
      await eliminarInformeBrecha(informeId, clienteId);
      router.refresh();
    });
  }

  function handleDescargarPdf(informe: DpdInformeBrecha) {
    const content = `INFORME MENSUAL DE BRECHAS DE SEGURIDAD\n\nMes: ${informe.mes} ${informe.anio}\n¿Hubo brecha?: ${informe.hubo_brecha ? "SÍ" : "NO"}\n\n${informe.contenido}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe_brechas_${informe.mes}_${informe.anio}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleEliminarBrecha(brechaId: string) {
    if (!confirm("¿Eliminar esta brecha de seguridad?")) return;
    startTransition(async () => {
      await eliminarBrecha(brechaId, clienteId);
      router.refresh();
    });
  }

  function handleCambiarEstado(brechaId: string, nuevoEstado: "abierta" | "contenida" | "cerrada") {
    startTransition(async () => {
      await cambiarEstadoBrecha(brechaId, clienteId, nuevoEstado);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* INFORMES DE BRECHAS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-bac-red" />
            Informe de brechas de seguridad
          </h4>
          <button
            onClick={() => setCreando(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo informe
          </button>
        </div>

        {informes.length === 0 ? (
          <p className="text-sm text-bac-gray-text">No hay informes de brechas registrados.</p>
        ) : (
          anios.map((anio) => (
            <div key={anio} className="space-y-1.5">
              <h5 className="text-xs font-semibold text-bac-gray-text uppercase tracking-wide">{anio}</h5>
              {porAnio[anio].map((inf) => (
                <div
                  key={inf.id}
                  className={`rounded-lg border-l-4 bg-white p-3 shadow-sm ${
                    inf.hubo_brecha ? "border-l-red-500" : "border-l-bac-score-verde"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{inf.mes}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            inf.hubo_brecha
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {inf.hubo_brecha ? "Brecha detectada" : "Sin brecha"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-700 whitespace-pre-line line-clamp-3">{inf.contenido}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setDetalleInforme(inf)}
                        className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditandoInforme(inf)}
                        className="rounded p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                        title="Editar informe"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDescargarPdf(inf)}
                        className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Descargar informe"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminar(inf.id)}
                        disabled={isPending}
                        className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Eliminar informe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* BRECHAS DE SEGURIDAD (auto-creadas desde informes) */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Brechas de seguridad
        </h4>
        {brechasSeguridad.length === 0 ? (
          <p className="text-sm text-bac-gray-text">No hay brechas de seguridad registradas.</p>
        ) : (
          <div className="rounded-xl border border-bac-gray-border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-bac-gray-border bg-bac-gray-alt text-xs font-medium uppercase tracking-wide text-bac-gray-text">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Fecha creación</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {brechasSeguridad.map((b) => {
                  const diasRestantes = b.estado === "cerrada" ? diasParaAutoEliminar(b.created_at) : null;
                  return (
                    <tr key={b.id} className="border-b border-bac-gray-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-medium">{b.tipo_incidente ?? "—"}</p>
                        {b.descripcion && (
                          <p className="text-xs text-bac-gray-text mt-0.5 line-clamp-2">{b.descripcion}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-bac-gray-text">{formatearFecha(b.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.estado === "abierta"
                              ? "bg-red-100 text-red-800"
                              : b.estado === "contenida"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {b.estado ?? "—"}
                        </span>
                        {diasRestantes !== null && (
                          <p className="text-[10px] text-red-500 mt-1">
                            {diasRestantes === 0
                              ? "Se eliminará pronto"
                              : `Se elimina en ${diasRestantes} día${diasRestantes !== 1 ? "s" : ""}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {b.estado !== "cerrada" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleCambiarEstado(b.id, "cerrada")}
                              className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              Cerrar
                            </button>
                          )}
                          {b.estado === "cerrada" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleCambiarEstado(b.id, "abierta")}
                              className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reabrir
                            </button>
                          )}
                          <button
                            onClick={() => setEditandoBrecha(b)}
                            className="rounded p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                            title="Editar brecha"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminarBrecha(b.id)}
                            disabled={isPending}
                            className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Eliminar brecha"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creando && (
        <CrearInformeBrechaModal
          planId={planId}
          clienteId={clienteId}
          onClose={() => setCreando(false)}
        />
      )}

      {detalleInforme && (
        <DetalleInformeModal informe={detalleInforme} onClose={() => setDetalleInforme(null)} />
      )}

      {editandoInforme && (
        <EditarInformeModal
          informe={editandoInforme}
          clienteId={clienteId}
          onClose={() => setEditandoInforme(null)}
        />
      )}

      {editandoBrecha && (
        <EditarBrechaModal
          brecha={editandoBrecha}
          clienteId={clienteId}
          onClose={() => setEditandoBrecha(null)}
        />
      )}
    </div>
  );
}

function DetalleInformeModal({ informe, onClose }: { informe: DpdInformeBrecha; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Detalle del informe</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-medium text-bac-gray-text">Mes</span>
              <p className="text-sm font-medium">{informe.mes}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-bac-gray-text">Año</span>
              <p className="text-sm font-medium">{informe.anio}</p>
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-bac-gray-text">¿Hubo brecha?</span>
            <p className="text-sm">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${informe.hubo_brecha ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                {informe.hubo_brecha ? "Sí" : "No"}
              </span>
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-bac-gray-text">Contenido</span>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3">{informe.contenido}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium hover:bg-bac-gray-alt">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function EditarInformeModal({
  informe,
  clienteId,
  onClose,
}: {
  informe: DpdInformeBrecha;
  clienteId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mes, setMes] = useState(informe.mes);
  const [anio, setAnio] = useState(informe.anio);
  const [huboBrecha, setHuboBrecha] = useState(informe.hubo_brecha);
  const [contenido, setContenido] = useState(informe.contenido);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim()) {
      setError("El contenido del informe es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await editarInformeBrecha(informe.id, clienteId, {
          mes,
          anio,
          hubo_brecha: huboBrecha,
          contenido: contenido.trim(),
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al editar el informe.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Editar informe de brechas</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                min={2020}
                max={2030}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={huboBrecha}
                onChange={(e) => setHuboBrecha(e.target.checked)}
                className="rounded border-gray-300"
              />
              ¿Hubo brecha de seguridad durante este periodo?
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contenido</label>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              rows={6}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60">
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditarBrechaModal({
  brecha,
  clienteId,
  onClose,
}: {
  brecha: BrechaSeguridadItem;
  clienteId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tipoIncidente, setTipoIncidente] = useState(brecha.tipo_incidente ?? "");
  const [descripcion, setDescripcion] = useState(brecha.descripcion ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipoIncidente.trim()) {
      setError("El tipo de incidente es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await editarBrecha(brecha.id, clienteId, {
          tipo_incidente: tipoIncidente.trim(),
          descripcion: descripcion.trim(),
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al editar la brecha.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Editar brecha de seguridad</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de incidente *</label>
            <input
              value={tipoIncidente}
              onChange={(e) => setTipoIncidente(e.target.value)}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
              placeholder="Ej: Acceso no autorizado"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60">
              {isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CrearInformeBrechaModal({
  planId,
  clienteId,
  onClose,
}: {
  planId: string;
  clienteId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mes, setMes] = useState(MESES[new Date().getMonth()]);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [huboBrecha, setHuboBrecha] = useState(false);
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim()) {
      setError("El contenido del informe es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await crearInformeBrecha(planId, clienteId, {
          mes,
          anio,
          hubo_brecha: huboBrecha,
          contenido: contenido.trim(),
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear el informe.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Nuevo informe de brechas</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                min={2020}
                max={2030}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={huboBrecha}
                onChange={(e) => setHuboBrecha(e.target.checked)}
                className="rounded border-gray-300"
              />
              ¿Hubo brecha de seguridad durante este periodo?
            </label>
          </div>

          {huboBrecha ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Detalle de la brecha (acciones tomadas, notificaciones, responsables, medios utilizados)
              </label>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
                rows={6}
                placeholder="Describa la brecha detectada, cómo se actuó, qué se hizo al respecto, a través de qué medio se trató, quién fue notificado, responsables y toda la información relevante..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Declaración de que no hubo brecha
              </label>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
                rows={4}
                placeholder="Se certifica que durante el periodo no se detectaron brechas de seguridad. Se notifica que no hubo incidentes y se detalla la información pertinente..."
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60">
              {isPending ? "Guardando..." : "Crear informe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
