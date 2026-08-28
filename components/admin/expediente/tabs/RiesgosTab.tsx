"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Plus, Trash2, X } from "lucide-react";
import { exportarMatrizXlsx } from "@/lib/export-excel";
import { exportarMatrizPdf } from "@/lib/export-pdf";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/DateInput";
import { COLUMNAS_RIESGO, GRUPOS_RIESGO, GRUPO_HEX, NIVEL_HEX, NIVEL_LABELS, celdaRiesgo, normalizarNivel } from "@/lib/riesgos-format";
import { SubirOCrearMatrizModal } from "./forms/SubirOCrearMatrizModal";
import { BotonAnalisisIA, ConfirmacionIAModal, ResultadoIAMatrizModal } from "./AnalisisIAModal";
import { analizarMatrizConIA } from "@/lib/admin/ia-actions";
import { actualizarActividadRiesgo, agregarActividadRiesgo, eliminarActividadRiesgo, eliminarMatrizRiesgos } from "@/lib/admin/expediente-actions";
import { crearPlan } from "@/lib/admin/plan-implementacion-actions";
import { EditableCell } from "./EditableCell";
import type { ActividadRat, MatrizVersion, CambiosCampoRat, PlanImplementacion } from "@/lib/admin/expediente";
import { CrearPlanModal } from "./PlanImplementacionTab";

const READ_ONLY_RIESGO_FIELDS = new Set(["riesgo_inherente", "nivel_riesgo", "riesgo_residual", "nivel_riesgo_residual"]);

function RiesgoPlanCell({
  actividadId,
  planes,
  onNavigateToTab,
  onCreatePlan,
}: {
  actividadId: string;
  planes: PlanImplementacion[];
  onNavigateToTab?: (tab: string, planId?: string) => void;
  onCreatePlan: () => void;
}) {
  const vinculados = planes.filter((p) => p.actividad_origen_id === actividadId);

  if (vinculados.length > 0) {
    return (
      <div className="space-y-1">
        {vinculados.map((p) => (
          <button
            key={p.id}
            onClick={() => onNavigateToTab?.("plan", p.id)}
            className="block text-left text-[11px] text-bac-red hover:underline font-medium truncate max-w-[120px]"
            title={p.titulo}
          >
            {p.titulo}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={onCreatePlan}
      className="inline-flex items-center gap-0.5 rounded border border-dashed border-bac-gray-border px-1.5 py-0.5 text-[10px] text-bac-gray-text hover:border-bac-red hover:text-bac-red"
    >
      <Plus className="h-2.5 w-2.5" /> Plan
    </button>
  );
}

export function RiesgosTab({
  clienteId,
  matrices,
  nombreEmpresa,
  ratActividades,
  cambiosCampoRiesgo,
  planes = [],
  onNavigateToTab,
}: {
  clienteId: string;
  matrices: MatrizVersion[];
  nombreEmpresa: string;
  ratActividades: ActividadRat[];
  cambiosCampoRiesgo?: CambiosCampoRat[];
  planes?: PlanImplementacion[];
  onNavigateToTab?: (tab: string, planId?: string) => void;
}) {
  const router = useRouter();
  const [isExporting, startExportTransition] = useTransition();
  const [mostrarSubir, setMostrarSubir] = useState(false);
  const [mostrarConfirmIA, setMostrarConfirmIA] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<{
    hallazgos: any[];
    resumen: string;
    riesgosCriticos: number;
    score: number | null;
    costo: string;
  } | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [crearPlanParaActividad, setCrearPlanParaActividad] = useState<{ id: string; nombre: string } | null>(null);
  const [mostrarAgregarRiesgo, setMostrarAgregarRiesgo] = useState(false);
  const actual = matrices[0];
  const actividadesParaPlan = actual
    ? actual.actividades.map((a, i) => ({ id: a.id, index: i + 1, nombre: a.actividad_tratamiento ?? `Riesgo ${i + 1}` }))
    : [];

  function getCambiosParaCelda(actividadId: string, campo: string) {
    if (!cambiosCampoRiesgo) return undefined;
    return cambiosCampoRiesgo.filter(
      (c) => c.actividad_rat_id === actividadId && c.campo === campo
    );
  }

  async function handleConfirmarIA() {
    if (!actual) return;
    setAnalizandoIA(true);
    setErrorIA(null);
    try {
      const res = await analizarMatrizConIA(clienteId, actual.id);
      setMostrarConfirmIA(false);
      setResultadoIA(res);
    } catch (e: any) {
      setMostrarConfirmIA(false);
      setErrorIA(e.message ?? "Error al analizar con IA");
    } finally {
      setAnalizandoIA(false);
    }
  }

  function handleDescargar(tipo: "excel" | "pdf") {
    if (!actual) return;
    const params = { nombreEmpresa, version: actual.version, actividades: actual.actividades };
    startExportTransition(() => {
      if (tipo === "excel") exportarMatrizXlsx(params);
      else exportarMatrizPdf(params);
    });
  }

  async function handleSaveCell(actividadId: string, campo: string, valor: unknown) {
    await actualizarActividadRiesgo(actividadId, clienteId, campo, valor);
    router.refresh();
  }

  async function handleAgregar(datos: Record<string, string>) {
    if (!actual) return;
    const newId = await agregarActividadRiesgo(actual.id, clienteId, datos);
    setMostrarAgregarRiesgo(false);
    router.refresh();
    return newId;
  }

  async function handleEliminar(actividadId: string) {
    if (!confirm("¿Eliminar este riesgo?")) return;
    await eliminarActividadRiesgo(actividadId, clienteId);
    router.refresh();
  }

  const modal = mostrarSubir && (
    <SubirOCrearMatrizModal
      clienteId={clienteId}
      ratActividades={ratActividades}
      onClose={() => setMostrarSubir(false)}
      onCreado={() => setMostrarSubir(false)}
    />
  );

  if (matrices.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-bac-gray-text">Este cliente aún no tiene una matriz de riesgos.</p>
        <button
          onClick={() => setMostrarSubir(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-sm font-medium text-white hover:bg-bac-red-dark"
        >
          <Upload className="h-3.5 w-3.5" /> Subir matriz en nombre del cliente
        </button>
        {modal}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {actual && (
          <BotonAnalisisIA tipo="riesgos" onClick={() => setMostrarConfirmIA(true)} />
        )}
        <button
          onClick={() => setMostrarSubir(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          <Upload className="h-3.5 w-3.5" /> Subir matriz
        </button>
        <button
          onClick={() => handleDescargar("pdf")}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
        <button
          onClick={() => handleDescargar("excel")}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
        {actual && (
          <button
            onClick={async () => {
              if (!confirm("¿Eliminar toda la matriz de riesgos? Esta acción no se puede deshacer.")) return;
              try {
                await eliminarMatrizRiesgos(actual.id, clienteId);
                router.refresh();
              } catch (err: any) {
                alert(err.message ?? "Error al eliminar la matriz.");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar matriz completa
          </button>
        )}
      </div>

      {actual.actividades.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-bac-gray-text">Esta versión no tiene actividades registradas.</p>
          <button
            onClick={() => setMostrarAgregarRiesgo(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir riesgo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-xl border border-bac-gray-border bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-white">
                  {GRUPOS_RIESGO.map((g) => (
                    <th
                      key={g.titulo}
                      colSpan={g.columnas.length}
                      className="whitespace-nowrap border-b border-white/20 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide"
                      style={{ backgroundColor: `#${GRUPO_HEX[g.titulo] ?? "1E3A8A"}` }}
                    >
                      {g.titulo}
                    </th>
                  ))}
                  <th className="whitespace-nowrap border-b border-white/20 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide" style={{ backgroundColor: "#7C3AED" }}>
                    Plan
                  </th>
                  <th className="px-2 py-2" style={{ backgroundColor: `#${GRUPO_HEX["Plan de Mitigación / Riesgo Residual"]}` }} />
                </tr>
                <tr className="bg-bac-gray-alt text-bac-gray-text">
                  {COLUMNAS_RIESGO.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-3 py-2 font-medium">
                      {c.label}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {actual.actividades.map((a) => (
                  <tr key={a.id} className="border-b border-bac-gray-border last:border-0">
                    {COLUMNAS_RIESGO.map((c) => {
                      const isReadOnly = READ_ONLY_RIESGO_FIELDS.has(c.key);
                      const esNivel = c.key === "nivel_riesgo" || c.key === "nivel_riesgo_residual";
                      const esRiesgoNum = c.key === "riesgo_inherente" || c.key === "riesgo_residual";
                      const nivelRaw = esRiesgoNum
                        ? (c.key === "riesgo_inherente" ? a.nivel_riesgo : a.nivel_riesgo_residual)
                        : esNivel ? String(a[c.key] ?? "") : null;
                      const nivelNorm = normalizarNivel(nivelRaw);
                      const hex = nivelNorm ? NIVEL_HEX[nivelNorm] : null;

                      if (isReadOnly) {
                        return (
                          <td key={c.key} className="whitespace-nowrap px-3 py-2 text-gray-700">
                            {hex ? (
                              <span
                                className="inline-flex min-w-[2.5rem] justify-center rounded px-2 py-0.5 text-xs font-semibold text-white"
                                style={{ backgroundColor: `#${hex}` }}
                              >
                                {esNivel && nivelNorm ? NIVEL_LABELS[nivelNorm] : celdaRiesgo(a, c.key)}
                              </span>
                            ) : (
                              celdaRiesgo(a, c.key)
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={c.key} className="whitespace-pre-line px-3 py-1 text-gray-700" style={{ minWidth: "100px" }}>
                          <EditableCell
                            value={a[c.key]}
                            field={c.key}
                            onSave={(campo, valor) => handleSaveCell(a.id, campo, valor)}
                            cambios={getCambiosParaCelda(a.id, c.key)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1" style={{ minWidth: "100px" }}>
                      <RiesgoPlanCell
                        actividadId={a.id}
                        planes={planes}
                        onNavigateToTab={onNavigateToTab}
                        onCreatePlan={() => setCrearPlanParaActividad({ id: a.id, nombre: a.actividad_tratamiento ?? `Riesgo` })}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        onClick={() => handleEliminar(a.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar riesgo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setMostrarAgregarRiesgo(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bac-gray-border px-3 py-1.5 text-xs font-medium text-bac-gray-text hover:border-bac-red hover:text-bac-red"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir riesgo
          </button>
        </div>
      )}

      {errorIA && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorIA}
        </div>
      )}

      {mostrarConfirmIA && (
        <ConfirmacionIAModal
          tipo="riesgos"
          analizando={analizandoIA}
          onConfirmar={handleConfirmarIA}
          onClose={() => { if (!analizandoIA) setMostrarConfirmIA(false); }}
        />
      )}

      {resultadoIA && (
        <ResultadoIAMatrizModal
          hallazgos={resultadoIA.hallazgos}
          resumen={resultadoIA.resumen}
          riesgosCriticos={resultadoIA.riesgosCriticos}
          score={resultadoIA.score}
          onClose={() => setResultadoIA(null)}
        />
      )}

      {modal}

      {crearPlanParaActividad && (
        <CrearPlanModal
          tipo="riesgos"
          clienteId={clienteId}
          actividades={actividadesParaPlan}
          preselectedActivityId={crearPlanParaActividad.id}
          onClose={() => setCrearPlanParaActividad(null)}
        />
      )}

      {mostrarAgregarRiesgo && (
        <AgregarActividadRiesgoModal
          clienteId={clienteId}
          onConfirm={handleAgregar}
          onClose={() => setMostrarAgregarRiesgo(false)}
        />
      )}
    </div>
  );
}

function AgregarActividadRiesgoModal({
  clienteId,
  onConfirm,
  onClose,
}: {
  clienteId: string;
  onConfirm: (datos: Record<string, string>) => Promise<string | void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    area_departamento: "",
    actividad_tratamiento: "",
    activos_relacionados: "",
    base_legal: "",
    articulo_ley: "",
    amenazas: "",
    vulnerabilidades: "",
    medidas_implementadas: "",
    medidas_implementar: "",
    responsable_implementacion: "",
  });
  const [planEnabled, setPlanEnabled] = useState(false);
  const [plan, setPlan] = useState({ titulo: "", responsable: "", departamento: "", actividad_nombre: "", actividad_realizar: "", fecha_inicio: "", fecha_fin: "" });

  const camposObligatorios = [
    { key: "actividad_tratamiento", label: "Actividad de Tratamiento", required: true },
    { key: "area_departamento", label: "Área / Departamento", required: true },
    { key: "base_legal", label: "Base Legal / Normativa", required: true },
    { key: "amenazas", label: "Amenazas Identificadas", required: true },
  ];

  const camposOpcionales = [
    { key: "activos_relacionados", label: "Activos de Información Relacionados" },
    { key: "articulo_ley", label: "Artículo / Ley Específica" },
    { key: "vulnerabilidades", label: "Vulnerabilidades" },
    { key: "medidas_implementadas", label: "Medidas ya Implementadas" },
    { key: "medidas_implementar", label: "Medidas a Implementar (Controles nuevos)" },
    { key: "responsable_implementacion", label: "Responsable Implementación" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.actividad_tratamiento.trim()) return;
    setSaving(true);
    try {
      const newId = await onConfirm(form);
      if (planEnabled && plan.titulo.trim() && newId) {
        await crearPlan(clienteId, {
          tipo: "riesgos",
          actividad_origen_id: newId,
          titulo: plan.titulo,
          responsable: plan.responsable || undefined,
          departamento: plan.departamento || undefined,
          actividad_nombre: plan.actividad_nombre || undefined,
          actividad_realizar: plan.actividad_realizar || undefined,
          fecha_inicio: plan.fecha_inicio || undefined,
          fecha_fin: plan.fecha_fin || undefined,
        });
      }
    } catch (err: any) {
      alert(err.message ?? "Error al crear riesgo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Nuevo riesgo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-bac-gray-text">
          Complete los campos obligatorios y opcionalmente los adicionales. El riesgo se añadirá al final de la matriz.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bac-red">Campos obligatorios</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {camposObligatorios.map((c) => (
                <div key={c.key} className={c.key === "actividad_tratamiento" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {c.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                    value={form[c.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))}
                    placeholder={c.label}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Campos opcionales</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {camposOpcionales.map((c) => (
                <div key={c.key}>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{c.label}</label>
                  <input
                    className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                    value={form[c.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))}
                    placeholder={c.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-bac-gray-text italic">
            Los campos de probabilidad, impacto, nivel de riesgo y EIPD se calculan automáticamente después de crear el riesgo.
          </p>

          <div className="border-t border-bac-gray-border pt-4">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={planEnabled} onChange={(e) => setPlanEnabled(e.target.checked)} className="rounded border-gray-300" />
              Crear plan de implementación para este riesgo
            </label>
            {planEnabled && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-lg border border-bac-gray-border p-3 bg-gray-50">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Título del plan <span className="text-red-500">*</span></label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.titulo} onChange={(e) => setPlan((p) => ({ ...p, titulo: e.target.value }))} placeholder="Título del plan" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Responsable</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.responsable} onChange={(e) => setPlan((p) => ({ ...p, responsable: e.target.value }))} placeholder="Responsable" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Departamento</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.departamento} onChange={(e) => setPlan((p) => ({ ...p, departamento: e.target.value }))} placeholder="Departamento" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Actividad a realizar</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.actividad_realizar} onChange={(e) => setPlan((p) => ({ ...p, actividad_realizar: e.target.value }))} placeholder="Actividad a realizar" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nombre de actividad</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.actividad_nombre} onChange={(e) => setPlan((p) => ({ ...p, actividad_nombre: e.target.value }))} placeholder="Nombre de actividad" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Fecha inicio</label>
                  <DateInput className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.fecha_inicio} onChange={(v) => setPlan((p) => ({ ...p, fecha_inicio: v }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Fecha fin</label>
                  <DateInput className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.fecha_fin} onChange={(v) => setPlan((p) => ({ ...p, fecha_fin: v }))} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-bac-gray-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-bac-gray-border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.actividad_tratamiento.trim() || (planEnabled && !plan.titulo.trim())}
              className="rounded-lg bg-bac-red px-4 py-2 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear riesgo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
