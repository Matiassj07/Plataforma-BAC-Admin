"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Download, FilePlus2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import { obtenerUrlDescargaDpd } from "@/lib/admin/dpd-actions";
import { eliminarPlanDpd, eliminarActividadDpd } from "@/lib/admin/expediente-actions";
import { MESES, type DpdData } from "@/lib/admin/dpd-types";
import { PlanDpdModal } from "./dpd/PlanDpdModal";
import { EditarPlanDpdModal } from "./dpd/EditarPlanDpdModal";
import { AnadirActividadModal } from "./dpd/AnadirActividadModal";
import { MarcarCompletadaModal } from "./dpd/MarcarCompletadaModal";
import { SubirInformeModal } from "./dpd/SubirInformeModal";
import { CrearActaModal } from "./dpd/CrearActaModal";
import { ActasList } from "./dpd/ActasList";
import { BrechasSeguridad } from "./dpd/BrechasSeguridad";
import type { BrechaSeguridadItem } from "@/lib/admin/expediente";

function formatearPeriodo(inicio: string, fin: string): string {
  const dInicio = new Date(inicio + "T00:00:00");
  const dFin = new Date(fin + "T00:00:00");
  const mesInicio = MESES[dInicio.getMonth()];
  const mesFin = MESES[dFin.getMonth()];
  if (dInicio.getFullYear() === dFin.getFullYear()) {
    return `${mesInicio} a ${mesFin} ${dFin.getFullYear()}`;
  }
  return `${mesInicio} ${dInicio.getFullYear()} a ${mesFin} ${dFin.getFullYear()}`;
}

export function DpdTab({ clienteId, dpd, brechasSeguridad }: { clienteId: string; dpd: DpdData; brechasSeguridad: BrechaSeguridadItem[] }) {
  const router = useRouter();
  const [modalPlan, setModalPlan] = useState<"subir" | "crear" | null>(null);
  const [editandoPlan, setEditandoPlan] = useState(false);
  const [anadiendoActividad, setAnadiendoActividad] = useState(false);
  const [completandoId, setCompletandoId] = useState<string | null>(null);
  const [subiendoInformeId, setSubiendoInformeId] = useState<string | null>(null);
  const [creandoActaPara, setCreandoActaPara] = useState<string | null | "sin-actividad">(null);
  const [descargando, setDescargando] = useState<string | null>(null);

  async function handleDescargar(path: string, key: string) {
    setDescargando(key);
    try {
      const url = await obtenerUrlDescargaDpd(clienteId, path);
      window.open(url, "_blank");
    } finally {
      setDescargando(null);
    }
  }

  if (!dpd.plan) {
    return (
      <div className="rounded-xl border border-dashed border-bac-gray-border bg-white p-8 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-bac-gray-text" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">
          Plan del Delegado de Protección de Datos
        </h3>
        <p className="mt-1 text-sm text-bac-gray-text">Aún no hay un plan DPD para este cliente.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setModalPlan("subir")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Upload className="h-4 w-4" /> Subir plan existente
          </button>
          <button
            onClick={() => setModalPlan("crear")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-sm font-medium text-white hover:bg-bac-red-dark"
          >
            <Pencil className="h-4 w-4" /> Crear plan en la plataforma
          </button>
        </div>

        {modalPlan && (
          <PlanDpdModal clienteId={clienteId} modo={modalPlan} onClose={() => setModalPlan(null)} />
        )}
      </div>
    );
  }

  const { plan, actividades, actas } = dpd;
  const completadas = actividades.filter((a) => a.completada).length;
  const total = actividades.length;
  const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const actividadesPorMes = [...actividades].sort((a, b) => a.mes - b.mes);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-bac-gray-border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ClipboardList className="h-4 w-4 text-bac-red" />
              Plan DPD — {formatearPeriodo(plan.periodo_inicio, plan.periodo_fin)}
            </h3>
            <p className="mt-1 text-xs text-bac-gray-text">
              DPD: {plan.nombre_dpd} · {plan.correo_dpd}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {plan.url_plan_adjunto && (
              <button
                onClick={() => handleDescargar(plan.url_plan_adjunto!, "plan")}
                disabled={descargando === "plan"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {descargando === "plan" ? "..." : "Descargar plan adjunto"}
              </button>
            )}
            <button
              onClick={() => setEditandoPlan(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar datos del plan
            </button>
            <button
              onClick={async () => {
                if (!confirm("¿Eliminar este plan DPD y todas sus actividades y actas?")) return;
                await eliminarPlanDpd(plan.id, clienteId);
                router.refresh();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar plan
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-bac-gray-text">
            <span>
              Progreso: {completadas} de {total} actividad{total !== 1 ? "es" : ""} completada
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
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Actividades del plan</h4>
          <button
            onClick={() => setAnadiendoActividad(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir actividad
          </button>
        </div>

        {actividadesPorMes.length === 0 ? (
          <p className="text-sm text-bac-gray-text">Este plan aún no tiene actividades registradas.</p>
        ) : (
          actividadesPorMes.map((act) => {
            const actasActividad = actas.filter((a) => a.actividad_id === act.id);
            return (
              <div
                key={act.id}
                className={`rounded-lg border-l-4 bg-white p-3 shadow-sm ${
                  act.completada ? "border-l-bac-score-verde" : "border-l-bac-gray-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {act.completada ? "☑" : "☐"} {MESES[act.mes - 1]} — {act.fase}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-700">{act.descripcion}</p>
                    {act.verificacion && (
                      <p className="mt-0.5 text-xs text-bac-gray-text">
                        Verificación: {act.verificacion}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("¿Eliminar esta actividad?")) return;
                      await eliminarActividadDpd(act.id, clienteId);
                      router.refresh();
                    }}
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar actividad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {act.completada ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-bac-score-verde">
                      ✓ Completada el {formatearFecha(act.fecha_completado)}
                    </p>
                    {act.observaciones && (
                      <p className="text-bac-gray-text">Observación: {act.observaciones}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                      {act.url_informe && (
                        <button
                          onClick={() => handleDescargar(act.url_informe!, `informe-${act.id}`)}
                          disabled={descargando === `informe-${act.id}`}
                          className="font-medium text-bac-red hover:underline disabled:opacity-60"
                        >
                          {descargando === `informe-${act.id}` ? "..." : "Ver informe"}
                        </button>
                      )}
                      {actasActividad.length > 0 && (
                        <span className="text-bac-gray-text">
                          {actasActividad.length} acta{actasActividad.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <button
                        onClick={() => setCreandoActaPara(act.id)}
                        className="font-medium text-bac-red hover:underline"
                      >
                        + Acta
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-bac-gray-text">○ Pendiente</span>
                    <button
                      onClick={() => setCompletandoId(act.id)}
                      className="font-medium text-bac-red hover:underline"
                    >
                      Marcar como completada
                    </button>
                    <button
                      onClick={() => setSubiendoInformeId(act.id)}
                      className="font-medium text-gray-700 hover:underline"
                    >
                      Subir informe
                    </button>
                    <button
                      onClick={() => setCreandoActaPara(act.id)}
                      className="font-medium text-gray-700 hover:underline"
                    >
                      + Acta
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Actas de no conformidad</h4>
          <button
            onClick={() => setCreandoActaPara("sin-actividad")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <FilePlus2 className="h-3.5 w-3.5" /> Nueva acta
          </button>
        </div>
        <ActasList clienteId={clienteId} actas={actas} />
      </div>

      <BrechasSeguridad planId={plan.id} clienteId={clienteId} informes={dpd.informesBrechas} brechasSeguridad={brechasSeguridad} />

      {editandoPlan && <EditarPlanDpdModal plan={plan} onClose={() => setEditandoPlan(false)} />}
      {anadiendoActividad && (
        <AnadirActividadModal
          planId={plan.id}
          clienteId={clienteId}
          onClose={() => setAnadiendoActividad(false)}
        />
      )}
      {completandoId && (
        <MarcarCompletadaModal
          actividadId={completandoId}
          clienteId={clienteId}
          onClose={() => setCompletandoId(null)}
        />
      )}
      {subiendoInformeId && (
        <SubirInformeModal
          actividadId={subiendoInformeId}
          clienteId={clienteId}
          onClose={() => setSubiendoInformeId(null)}
        />
      )}
      {creandoActaPara !== null && (
        <CrearActaModal
          planId={plan.id}
          clienteId={clienteId}
          actividades={actividades}
          actividadPreseleccionada={creandoActaPara === "sin-actividad" ? null : creandoActaPara}
          onClose={() => setCreandoActaPara(null)}
        />
      )}
    </div>
  );
}
