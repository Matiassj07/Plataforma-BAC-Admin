"use client";

import { Trash2 } from "lucide-react";
import { FormCampo, campoClass, campoReadonlyClass } from "./FormCampo";
import { calcularNivelRiesgo, calcularRequiereEipd, NIVEL_HEX, NIVEL_LABELS } from "@/lib/riesgos-format";
import type { ActividadRat } from "@/lib/admin/expediente";

export interface RiesgoFormState {
  actividad_rat_id: string;
  cat_especiales_gran_escala: boolean;
  obs_sistematica_publica: boolean;
  codigo: string;
  amenazas: string;
  vulnerabilidades: string;
  probabilidad: string;
  impacto: string;
  medidas_implementar: string;
  prob_residual: string;
  imp_residual: string;
  semaforo: "" | "rojo" | "amarillo" | "verde";
  area_departamento: string;
  responsable_implementacion: string;
}

export const RIESGO_VACIO: RiesgoFormState = {
  actividad_rat_id: "",
  cat_especiales_gran_escala: false,
  obs_sistematica_publica: false,
  codigo: "",
  amenazas: "",
  vulnerabilidades: "",
  probabilidad: "",
  impacto: "",
  medidas_implementar: "",
  prob_residual: "",
  imp_residual: "",
  semaforo: "",
  area_departamento: "",
  responsable_implementacion: "",
};

const CAMPOS_OBLIGATORIOS: (keyof RiesgoFormState)[] = [
  "actividad_rat_id",
  "codigo",
  "amenazas",
  "vulnerabilidades",
  "probabilidad",
  "impacto",
  "medidas_implementar",
  "prob_residual",
  "imp_residual",
  "semaforo",
];

export function validarRiesgo(r: RiesgoFormState): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (!r[campo] || !String(r[campo]).trim()) errores[campo] = "Obligatorio";
  }
  return errores;
}

export function tieneCategoriasEspeciales(valor: string | null): boolean {
  if (!valor) return false;
  const v = valor.trim().toLowerCase();
  return v !== "" && v !== "ninguna" && v !== "no";
}

export function RiesgoFieldset({
  index,
  value,
  onChange,
  onRemove,
  errors,
  ratActividades,
}: {
  index: number;
  value: RiesgoFormState;
  onChange: (v: RiesgoFormState) => void;
  onRemove: () => void;
  errors: Record<string, string>;
  ratActividades: ActividadRat[];
}) {
  function set<K extends keyof RiesgoFormState>(key: K, val: RiesgoFormState[K]) {
    onChange({ ...value, [key]: val });
  }

  function handleSeleccionarActividad(id: string) {
    const act = ratActividades.find((a) => a.id === id);
    onChange({
      ...value,
      actividad_rat_id: id,
      cat_especiales_gran_escala: act ? tieneCategoriasEspeciales(act.categorias_especiales) : false,
    });
  }

  const actividad = ratActividades.find((a) => a.id === value.actividad_rat_id) ?? null;

  const prob = Number(value.probabilidad) || 0;
  const imp = Number(value.impacto) || 0;
  const riesgoInherente = prob && imp ? prob * imp : null;
  const nivel = riesgoInherente ? calcularNivelRiesgo(riesgoInherente) : null;

  const probR = Number(value.prob_residual) || 0;
  const impR = Number(value.imp_residual) || 0;
  const riesgoResidual = probR && impR ? probR * impR : null;
  const nivelResidual = riesgoResidual ? calcularNivelRiesgo(riesgoResidual) : null;

  const requiereEipd = nivel
    ? calcularRequiereEipd({
        nivel,
        catEspecialesGranEscala: value.cat_especiales_gran_escala,
        obsSistematicaPublica: value.obs_sistematica_publica,
        tratAutomatizado: !!actividad?.perfiles_automatizados,
      })
    : null;

  return (
    <div className="space-y-3 rounded-xl border border-bac-gray-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Riesgo #{index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs font-medium text-bac-score-rojo hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" /> Quitar
        </button>
      </div>

      <FormCampo label="Actividad de Tratamiento (del RAT)" required error={errors.actividad_rat_id}>
        <select
          className={campoClass(!!errors.actividad_rat_id)}
          value={value.actividad_rat_id}
          onChange={(e) => handleSeleccionarActividad(e.target.value)}
        >
          <option value="">Selecciona una actividad del RAT...</option>
          {ratActividades.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre_actividad}
            </option>
          ))}
        </select>
      </FormCampo>

      {actividad && (
        <div className="grid grid-cols-1 gap-3 rounded-lg bg-bac-gray-alt p-3 sm:grid-cols-2">
          <FormCampo label="Base Legal / Normativa" hint="Prellenado desde el RAT">
            <p className={campoReadonlyClass()}>{actividad.base_licitud || "—"}</p>
          </FormCampo>
          <FormCampo label="Artículo / Ley Específica" hint="Prellenado desde el RAT">
            <p className={campoReadonlyClass()}>{actividad.articulo_lopdp || "—"}</p>
          </FormCampo>
          <FormCampo label="Activos Relacionados" hint="Prellenado desde el RAT">
            <p className={campoReadonlyClass()}>{actividad.activo_informacion || "—"}</p>
          </FormCampo>
          <FormCampo label="Medidas ya Implementadas" hint="Prellenado desde el RAT">
            <p className={campoReadonlyClass()}>{actividad.medidas_seguridad || "—"}</p>
          </FormCampo>
          <FormCampo label="¿Tratamiento automatizado?" hint="Prellenado desde el RAT">
            <p className={campoReadonlyClass()}>{actividad.perfiles_automatizados ? "Sí" : "No"}</p>
          </FormCampo>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormCampo
          label="¿Categorías especiales a gran escala?"
          hint="Sugerido según el RAT — puedes ajustarlo"
        >
          <select
            className={campoClass()}
            value={value.cat_especiales_gran_escala ? "si" : "no"}
            onChange={(e) => set("cat_especiales_gran_escala", e.target.value === "si")}
          >
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </FormCampo>
        <FormCampo label="¿Observación sistemática pública?" hint="Sugerido, no marcado por defecto">
          <select
            className={campoClass()}
            value={value.obs_sistematica_publica ? "si" : "no"}
            onChange={(e) => set("obs_sistematica_publica", e.target.value === "si")}
          >
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </FormCampo>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormCampo label="Código" required error={errors.codigo}>
          <input
            className={campoClass(!!errors.codigo)}
            value={value.codigo}
            onChange={(e) => set("codigo", e.target.value)}
            placeholder="RIES-01"
          />
        </FormCampo>
        <FormCampo label="Área / Departamento" hint="Opcional">
          <input
            className={campoClass()}
            value={value.area_departamento}
            onChange={(e) => set("area_departamento", e.target.value)}
          />
        </FormCampo>
        <FormCampo label="Responsable de Implementación" hint="Opcional">
          <input
            className={campoClass()}
            value={value.responsable_implementacion}
            onChange={(e) => set("responsable_implementacion", e.target.value)}
          />
        </FormCampo>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormCampo label="Amenazas Identificadas" required error={errors.amenazas}>
          <textarea
            rows={2}
            className={campoClass(!!errors.amenazas)}
            value={value.amenazas}
            onChange={(e) => set("amenazas", e.target.value)}
          />
        </FormCampo>
        <FormCampo label="Vulnerabilidades" required error={errors.vulnerabilidades}>
          <textarea
            rows={2}
            className={campoClass(!!errors.vulnerabilidades)}
            value={value.vulnerabilidades}
            onChange={(e) => set("vulnerabilidades", e.target.value)}
          />
        </FormCampo>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormCampo label="Probabilidad (1-5)" required error={errors.probabilidad}>
          <select
            className={campoClass(!!errors.probabilidad)}
            value={value.probabilidad}
            onChange={(e) => set("probabilidad", e.target.value)}
          >
            <option value="">-</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FormCampo>
        <FormCampo label="Impacto (1-5)" required error={errors.impacto}>
          <select
            className={campoClass(!!errors.impacto)}
            value={value.impacto}
            onChange={(e) => set("impacto", e.target.value)}
          >
            <option value="">-</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FormCampo>
        <FormCampo label="Riesgo Inherente" hint="Calculado automático">
          <p className={campoReadonlyClass()}>{riesgoInherente ?? "—"}</p>
        </FormCampo>
        <FormCampo label="Nivel de Riesgo" hint="Calculado automático">
          <p
            className={campoReadonlyClass()}
            style={nivel ? { color: `#${NIVEL_HEX[nivel]}`, fontWeight: 600 } : undefined}
          >
            {nivel ? NIVEL_LABELS[nivel] : "—"}
          </p>
        </FormCampo>
      </div>

      <FormCampo label="¿Requiere EIPD?" hint="Calculado automático según nivel de riesgo y Art. 41 LOPDP">
        <p className={campoReadonlyClass()}>{requiereEipd == null ? "—" : requiereEipd ? "Sí" : "No"}</p>
      </FormCampo>

      <FormCampo label="Medidas a Implementar (Controles nuevos)" required error={errors.medidas_implementar}>
        <textarea
          rows={2}
          className={campoClass(!!errors.medidas_implementar)}
          value={value.medidas_implementar}
          onChange={(e) => set("medidas_implementar", e.target.value)}
        />
      </FormCampo>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <FormCampo label="Prob. Residual (1-5)" required error={errors.prob_residual}>
          <select
            className={campoClass(!!errors.prob_residual)}
            value={value.prob_residual}
            onChange={(e) => set("prob_residual", e.target.value)}
          >
            <option value="">-</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FormCampo>
        <FormCampo label="Imp. Residual (1-5)" required error={errors.imp_residual}>
          <select
            className={campoClass(!!errors.imp_residual)}
            value={value.imp_residual}
            onChange={(e) => set("imp_residual", e.target.value)}
          >
            <option value="">-</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </FormCampo>
        <FormCampo label="Riesgo Residual" hint="Calculado">
          <p className={campoReadonlyClass()}>{riesgoResidual ?? "—"}</p>
        </FormCampo>
        <FormCampo label="Nivel Residual" hint="Calculado">
          <p
            className={campoReadonlyClass()}
            style={nivelResidual ? { color: `#${NIVEL_HEX[nivelResidual]}`, fontWeight: 600 } : undefined}
          >
            {nivelResidual ? NIVEL_LABELS[nivelResidual] : "—"}
          </p>
        </FormCampo>
        <FormCampo label="Semáforo manual" required error={errors.semaforo}>
          <select
            className={campoClass(!!errors.semaforo)}
            value={value.semaforo}
            onChange={(e) => set("semaforo", e.target.value as RiesgoFormState["semaforo"])}
          >
            <option value="">-</option>
            <option value="rojo">🔴 Rojo</option>
            <option value="amarillo">🟡 Amarillo</option>
            <option value="verde">🟢 Verde</option>
          </select>
        </FormCampo>
      </div>
    </div>
  );
}
