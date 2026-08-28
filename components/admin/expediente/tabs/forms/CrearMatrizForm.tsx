"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { DateInput } from "@/components/DateInput";
import {
  RIESGO_VACIO,
  RiesgoFieldset,
  tieneCategoriasEspeciales,
  type RiesgoFormState,
  validarRiesgo,
} from "./RiesgoFieldset";
import { calcularNivelRiesgo, calcularRequiereEipd } from "@/lib/riesgos-format";
import { crearMatrizCompleta, type RiesgoInput } from "@/lib/admin/expediente-actions";
import { crearPlan } from "@/lib/admin/plan-implementacion-actions";
import type { ActividadRat } from "@/lib/admin/expediente";
import type { RiesgoExtraido } from "@/lib/admin/riesgo-parser";

interface PlanDraft {
  enabled: boolean;
  titulo: string;
  responsable: string;
  departamento: string;
  actividad_nombre: string;
  actividad_realizar: string;
  fecha_inicio: string;
  fecha_fin: string;
}

function extraidoAFormState(r: RiesgoExtraido): RiesgoFormState {
  return {
    actividad_rat_id: r.actividad_rat_id,
    cat_especiales_gran_escala: r.cat_especiales_gran_escala,
    obs_sistematica_publica: r.obs_sistematica_publica,
    codigo: r.codigo,
    amenazas: r.amenazas,
    vulnerabilidades: r.vulnerabilidades,
    probabilidad: r.probabilidad,
    impacto: r.impacto,
    medidas_implementar: r.medidas_implementar,
    prob_residual: r.prob_residual,
    imp_residual: r.imp_residual,
    semaforo: r.semaforo,
    area_departamento: r.area_departamento,
    responsable_implementacion: r.responsable_implementacion,
  };
}

/** Un riesgo por actividad del RAT, con la actividad y sus campos sugeridos ya pre-cargados. */
function riesgosIniciales(ratActividades: ActividadRat[]): RiesgoFormState[] {
  if (ratActividades.length === 0) return [{ ...RIESGO_VACIO }];
  return ratActividades.map((a) => ({
    ...RIESGO_VACIO,
    actividad_rat_id: a.id,
    cat_especiales_gran_escala: tieneCategoriasEspeciales(a.categorias_especiales),
  }));
}

const PLAN_VACIO: PlanDraft = {
  enabled: false, titulo: "", responsable: "", departamento: "",
  actividad_nombre: "", actividad_realizar: "", fecha_inicio: "", fecha_fin: "",
};

export function CrearMatrizForm({
  clienteId,
  ratActividades,
  riesgosExtraidos,
  onCreado,
  onCancelar,
}: {
  clienteId: string;
  ratActividades: ActividadRat[];
  riesgosExtraidos?: RiesgoExtraido[];
  onCreado: () => void;
  onCancelar: () => void;
}) {
  const [riesgos, setRiesgos] = useState<RiesgoFormState[]>(() =>
    riesgosExtraidos && riesgosExtraidos.length > 0
      ? riesgosExtraidos.map(extraidoAFormState)
      : riesgosIniciales(ratActividades)
  );
  const [errores, setErrores] = useState<Record<string, string>[]>(() => {
    const count = riesgosExtraidos && riesgosExtraidos.length > 0
      ? riesgosExtraidos.length
      : riesgosIniciales(ratActividades).length;
    return Array.from({ length: count }, () => ({}));
  });
  const [planes, setPlanes] = useState<PlanDraft[]>(() => {
    const count = riesgosExtraidos && riesgosExtraidos.length > 0
      ? riesgosExtraidos.length
      : riesgosIniciales(ratActividades).length;
    return Array.from({ length: count }, () => ({ ...PLAN_VACIO }));
  });
  const [errorGeneral, setErrorGeneral] = useState<string | null>(
    riesgosExtraidos && riesgosExtraidos.length > 0
      ? "Revisa los riesgos extraídos del archivo y completa los campos que quedaron marcados como obligatorios antes de guardar."
      : null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!riesgosExtraidos || riesgosExtraidos.length === 0) return;
    setErrores(riesgos.map(validarRiesgo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function actualizar(idx: number, v: RiesgoFormState) {
    setRiesgos((arr) => arr.map((r, i) => (i === idx ? v : r)));
  }

  function añadir() {
    setRiesgos((arr) => [...arr, { ...RIESGO_VACIO }]);
    setErrores((arr) => [...arr, {}]);
    setPlanes((arr) => [...arr, { ...PLAN_VACIO }]);
  }

  function quitar(idx: number) {
    setRiesgos((arr) => arr.filter((_, i) => i !== idx));
    setErrores((arr) => arr.filter((_, i) => i !== idx));
    setPlanes((arr) => arr.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (riesgos.length === 0) {
      setErrorGeneral("Añade al menos un riesgo.");
      return;
    }
    const errs = riesgos.map(validarRiesgo);
    setErrores(errs);
    if (errs.some((e) => Object.keys(e).length > 0)) {
      setErrorGeneral("Completa todos los campos obligatorios (marcados con *) antes de guardar.");
      return;
    }
    setErrorGeneral(null);

    const input: RiesgoInput[] = riesgos.map((r) => {
      const actividad = ratActividades.find((a) => a.id === r.actividad_rat_id) ?? null;
      const probabilidad = Number(r.probabilidad);
      const impacto = Number(r.impacto);
      const probResidual = Number(r.prob_residual);
      const impResidual = Number(r.imp_residual);
      const riesgoInherente = probabilidad * impacto;
      const riesgoResidual = probResidual * impResidual;
      const nivel = calcularNivelRiesgo(riesgoInherente);
      const nivelResidual = calcularNivelRiesgo(riesgoResidual);
      const tratAutomatizado = !!actividad?.perfiles_automatizados;

      return {
        actividad_rat_id: r.actividad_rat_id || null,
        area_departamento: r.area_departamento || null,
        actividad_tratamiento: actividad?.nombre_actividad ?? null,
        cat_especiales_gran_escala: r.cat_especiales_gran_escala,
        obs_sistematica_publica: r.obs_sistematica_publica,
        trat_automatizado: tratAutomatizado,
        activos_relacionados: actividad?.activo_informacion ?? null,
        base_legal: actividad?.base_licitud ?? null,
        articulo_ley: actividad?.articulo_lopdp ?? null,
        codigo: r.codigo,
        amenazas: r.amenazas,
        vulnerabilidades: r.vulnerabilidades,
        medidas_implementadas: actividad?.medidas_seguridad ?? null,
        probabilidad,
        impacto,
        nivel_riesgo: nivel,
        requiere_eipd: calcularRequiereEipd({
          nivel,
          catEspecialesGranEscala: r.cat_especiales_gran_escala,
          obsSistematicaPublica: r.obs_sistematica_publica,
          tratAutomatizado,
        }),
        medidas_implementar: r.medidas_implementar,
        prob_residual: probResidual,
        imp_residual: impResidual,
        nivel_riesgo_residual: nivelResidual,
        responsable_implementacion: r.responsable_implementacion || null,
        semaforo: r.semaforo as "rojo" | "amarillo" | "verde",
      };
    });

    startTransition(async () => {
      try {
        const result = await crearMatrizCompleta(clienteId, input);

        if (result) {
          const planPromises: Promise<void>[] = [];
          for (let i = 0; i < result.actividadIds.length; i++) {
            const plan = planes[i];
            if (plan?.enabled && plan.titulo.trim()) {
              const actividad = ratActividades.find((a) => a.id === riesgos[i]?.actividad_rat_id);
              planPromises.push(
                crearPlan(clienteId, {
                  tipo: "riesgos",
                  actividad_origen_id: result.actividadIds[i],
                  titulo: plan.titulo.trim(),
                  responsable: plan.responsable.trim() || undefined,
                  departamento: plan.departamento.trim() || undefined,
                  actividad_nombre: plan.actividad_nombre.trim() || actividad?.nombre_actividad || undefined,
                  actividad_realizar: plan.actividad_realizar.trim() || undefined,
                  fecha_inicio: plan.fecha_inicio || undefined,
                  fecha_fin: plan.fecha_fin || undefined,
                })
              );
            }
          }
          if (planPromises.length > 0) {
            try {
              await Promise.all(planPromises);
            } catch {
              setErrorGeneral("La matriz se guardó correctamente, pero hubo un error al crear algunos planes de implementación.");
            }
          }
        }

        onCreado();
      } catch (err) {
        setErrorGeneral(err instanceof Error ? err.message : "No se pudo guardar la matriz.");
      }
    });
  }

  if (ratActividades.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-bac-gray-text">
          Este cliente todavía no tiene actividades de tratamiento registradas en el RAT. La
          matriz de riesgos se construye a partir de esas actividades — crea o sube primero el RAT
          en la pestaña correspondiente.
        </p>
        <div className="flex justify-end">
          <button
            onClick={onCancelar}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
        Se creó un riesgo por cada una de las {ratActividades.length} actividades del RAT, con los
        campos prellenados y sugeridos ya cargados. Completa los campos obligatorios de cada uno o
        añade riesgos adicionales si una actividad requiere más de un riesgo.
      </p>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Riesgos identificados</h3>
        <button
          type="button"
          onClick={añadir}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          <Plus className="h-3.5 w-3.5" /> Añadir riesgo
        </button>
      </div>

      {riesgos.map((r, i) => (
        <div key={i} className="space-y-2">
          <RiesgoFieldset
            index={i}
            value={r}
            onChange={(v) => actualizar(i, v)}
            onRemove={() => quitar(i)}
            errors={errores[i] ?? {}}
            ratActividades={ratActividades}
          />
          <div className="ml-4 rounded-lg border border-dashed border-bac-gray-border p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={planes[i]?.enabled ?? false}
                onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, enabled: e.target.checked } : p))}
                className="rounded border-bac-gray-border text-bac-red focus:ring-bac-red"
              />
              Crear plan de implementación para este riesgo
            </label>
            {planes[i]?.enabled && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-bac-gray-text">Título del plan *</label>
                  <input
                    value={planes[i].titulo}
                    onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, titulo: e.target.value } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    placeholder="Título del plan"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-bac-gray-text">Responsable</label>
                  <input
                    value={planes[i].responsable}
                    onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, responsable: e.target.value } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    placeholder="Nombre del responsable"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-bac-gray-text">Departamento</label>
                  <input
                    value={planes[i].departamento}
                    onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, departamento: e.target.value } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    placeholder="Ej: Talento humano"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-bac-gray-text">Nombre de la actividad</label>
                  <input
                    value={planes[i].actividad_nombre}
                    onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, actividad_nombre: e.target.value } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    placeholder="Nombre de la actividad"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-bac-gray-text">Actividad a realizar</label>
                  <input
                    value={planes[i].actividad_realizar}
                    onChange={(e) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, actividad_realizar: e.target.value } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                    placeholder="Describa el plan o implementación"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-bac-gray-text">Fecha inicio</label>
                  <DateInput
                    value={planes[i].fecha_inicio}
                    onChange={(v) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, fecha_inicio: v } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-bac-gray-text">Fecha fin</label>
                  <DateInput
                    value={planes[i].fecha_fin}
                    onChange={(v) => setPlanes((arr) => arr.map((p, pi) => pi === i ? { ...p, fecha_fin: v } : p))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-bac-gray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bac-red"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {errorGeneral && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bac-score-rojo">{errorGeneral}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-bac-gray-border pt-4">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
        >
          {isPending ? "Guardando..." : "Guardar matriz"}
        </button>
      </div>
    </form>
  );
}
