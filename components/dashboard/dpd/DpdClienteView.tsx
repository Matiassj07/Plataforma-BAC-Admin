"use client";

import { useState } from "react";
import { Download, ClipboardList } from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import { obtenerUrlDescargaDpdCliente, obtenerUrlDescargaActaCliente } from "@/lib/dpd-cliente-actions";
import { MESES, type DpdData } from "@/lib/admin/dpd-types";
import { SubirActaFirmadaModal } from "./SubirActaFirmadaModal";

function formatearPeriodo(inicio: string, fin: string): string {
  const dInicio = new Date(inicio + "T00:00:00");
  const dFin = new Date(fin + "T00:00:00");
  const mesInicio = MESES[dInicio.getMonth()];
  const mesFin = MESES[dFin.getMonth()];
  if (dInicio.getFullYear() === dFin.getFullYear()) {
    return `${mesInicio} – ${mesFin} ${dFin.getFullYear()}`;
  }
  return `${mesInicio} ${dInicio.getFullYear()} – ${mesFin} ${dFin.getFullYear()}`;
}

export function DpdClienteView({ dpd, soloLectura }: { dpd: DpdData; soloLectura: boolean }) {
  const [descargando, setDescargando] = useState<string | null>(null);
  const [subiendoActaId, setSubiendoActaId] = useState<string | null>(null);

  async function handleDescargarPlan(path: string) {
    setDescargando("plan");
    try {
      const url = await obtenerUrlDescargaDpdCliente(path);
      window.open(url, "_blank");
    } finally {
      setDescargando(null);
    }
  }

  async function handleDescargarInforme(path: string, key: string) {
    setDescargando(key);
    try {
      const url = await obtenerUrlDescargaDpdCliente(path);
      window.open(url, "_blank");
    } finally {
      setDescargando(null);
    }
  }

  async function handleDescargarActa(path: string, key: string) {
    setDescargando(key);
    try {
      const url = await obtenerUrlDescargaActaCliente(path);
      window.open(url, "_blank");
    } finally {
      setDescargando(null);
    }
  }

  if (!dpd.plan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-center text-sm text-bac-gray-text">
          Todavía no hay un plan del Delegado de Protección de Datos disponible.
        </p>
      </div>
    );
  }

  const { plan, actividades, actas } = dpd;
  const completadas = actividades.filter((a) => a.completada).length;
  const total = actividades.length;
  const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
  const actividadesPorMes = [...actividades].sort((a, b) => a.mes - b.mes);
  const actasPendientes = actas.filter((a) => a.estado === "pendiente_firma");

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="rounded-xl border border-bac-gray-border bg-white p-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ClipboardList className="h-5 w-5 text-bac-red" />
          Plan del Delegado de Protección de Datos
        </h1>
        <p className="mt-1 text-sm text-bac-gray-text">
          DPD: {plan.nombre_dpd} · {plan.correo_dpd}
        </p>
        <p className="text-sm text-bac-gray-text">
          Período: {formatearPeriodo(plan.periodo_inicio, plan.periodo_fin)}
        </p>
        {plan.url_plan_adjunto && (
          <button
            onClick={() => handleDescargarPlan(plan.url_plan_adjunto!)}
            disabled={descargando === "plan"}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {descargando === "plan" ? "..." : "Descargar plan"}
          </button>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-bac-gray-text">
            <span>
              {completadas} de {total} actividad{total !== 1 ? "es" : ""} completada
              {completadas !== 1 ? "s" : ""}
            </span>
            <span>{progreso}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bac-gray-alt">
            <div className="h-full rounded-full bg-bac-score-verde" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {actividadesPorMes.length === 0 ? (
          <p className="text-sm text-bac-gray-text">Este plan aún no tiene actividades registradas.</p>
        ) : (
          actividadesPorMes.map((act) => (
            <div
              key={act.id}
              className={`rounded-lg border-l-4 bg-white p-3 shadow-sm ${
                act.completada ? "border-l-bac-score-verde" : "border-l-bac-gray-border"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">
                {act.completada ? "✓" : "○"} {MESES[act.mes - 1]} — {act.fase}
              </p>
              <p className="mt-0.5 text-sm text-gray-700">{act.descripcion}</p>
              {act.completada ? (
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-bac-score-verde">
                    Completada el {formatearFecha(act.fecha_completado)}
                  </p>
                  {act.observaciones && (
                    <p className="text-bac-gray-text">Observación: {act.observaciones}</p>
                  )}
                  {act.url_informe && (
                    <button
                      onClick={() => handleDescargarInforme(act.url_informe!, `informe-${act.id}`)}
                      disabled={descargando === `informe-${act.id}`}
                      className="font-medium text-bac-red hover:underline disabled:opacity-60"
                    >
                      {descargando === `informe-${act.id}` ? "..." : "Ver informe"}
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-bac-gray-text">Pendiente</p>
              )}
            </div>
          ))
        )}
      </div>

      {actasPendientes.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">⚠ Actas que requieren tu firma</h2>
          <div className="mt-2 space-y-3">
            {actasPendientes.map((acta) => (
              <div key={acta.id} className="rounded-lg bg-white p-3">
                <p className="text-sm font-medium text-gray-900">{acta.numero_acta}</p>
                <p className="mt-0.5 text-xs text-bac-gray-text">
                  El DPD identificó un hallazgo que requiere tu atención.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {acta.url_acta_generada && (
                    <button
                      onClick={() => handleDescargarActa(acta.url_acta_generada!, `acta-${acta.id}`)}
                      disabled={descargando === `acta-${acta.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar acta
                    </button>
                  )}
                  {!soloLectura && (
                    <button
                      onClick={() => setSubiendoActaId(acta.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red-dark"
                    >
                      ⬆ Subir acta firmada
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-bac-gray-text">
                  Una vez firmada, súbela aquí para completar el proceso.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {subiendoActaId && (
        <SubirActaFirmadaModal actaId={subiendoActaId} onClose={() => setSubiendoActaId(null)} />
      )}
    </div>
  );
}
