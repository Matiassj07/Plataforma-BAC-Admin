import type { ActividadRiesgo } from "@/lib/admin/expediente";

export interface GrupoRiesgo {
  titulo: string;
  columnas: { key: keyof ActividadRiesgo; label: string }[];
}

export const GRUPOS_RIESGO: GrupoRiesgo[] = [
  {
    titulo: "Tratamiento de Datos Personales",
    columnas: [
      { key: "area_departamento", label: "Área / Departamento" },
      { key: "actividad_tratamiento", label: "Actividad de Tratamiento" },
      { key: "cat_especiales_gran_escala", label: "¿Categorías especiales gran escala?" },
      { key: "obs_sistematica_publica", label: "¿Observación sistemática pública?" },
      { key: "trat_automatizado", label: "¿Tratamiento automatizado?" },
      { key: "activos_relacionados", label: "Activos de Información Relacionados" },
      { key: "base_legal", label: "Base Legal / Normativa" },
      { key: "articulo_ley", label: "Artículo / Ley Específica" },
      { key: "amenazas", label: "Amenazas Identificadas" },
      { key: "vulnerabilidades", label: "Vulnerabilidades" },
      { key: "medidas_implementadas", label: "Medidas ya Implementadas" },
    ],
  },
  {
    titulo: "Análisis de Riesgo Inherente",
    columnas: [
      { key: "probabilidad", label: "Prob. (1-5)" },
      { key: "impacto", label: "Impacto (1-5)" },
      { key: "riesgo_inherente", label: "Riesgo Inherente" },
      { key: "nivel_riesgo", label: "Nivel de Riesgo" },
    ],
  },
  {
    titulo: "EIPD",
    columnas: [{ key: "requiere_eipd", label: "¿Requiere EIPD?" }],
  },
  {
    titulo: "Plan de Mitigación / Riesgo Residual",
    columnas: [
      { key: "medidas_implementar", label: "Medidas a Implementar (Controles nuevos)" },
      { key: "prob_residual", label: "Prob. Residual (1-5)" },
      { key: "imp_residual", label: "Imp. Residual (1-5)" },
      { key: "riesgo_residual", label: "Riesgo Residual" },
      { key: "nivel_riesgo_residual", label: "Nivel de Riesgo Residual" },
      { key: "responsable_implementacion", label: "Responsable Implementación" },
    ],
  },
];

export const COLUMNAS_RIESGO = GRUPOS_RIESGO.flatMap((g) => g.columnas);

const BOOL_KEYS = new Set<keyof ActividadRiesgo>([
  "cat_especiales_gran_escala",
  "obs_sistematica_publica",
  "trat_automatizado",
  "requiere_eipd",
]);

export function celdaRiesgo(a: ActividadRiesgo, key: keyof ActividadRiesgo): string | number {
  const valor = a[key];
  if (BOOL_KEYS.has(key)) return valor == null ? "—" : valor ? "Sí" : "No";
  if (valor == null) return "—";
  if (typeof valor === "number") return valor;
  return valor as string;
}

/** Colores hex (sin '#') por nivel de riesgo, usados en Excel/PDF y en pantalla. */
export const NIVEL_HEX: Record<string, string> = {
  critico: "B91C1C",
  alto: "EA580C",
  medio: "CA8A04",
  bajo: "16A34A",
  muy_bajo: "0891B2",
};

export const GRUPO_HEX: Record<string, string> = {
  "Tratamiento de Datos Personales": "1E3A8A",
  "Análisis de Riesgo Inherente": "9333EA",
  EIPD: "0891B2",
  "Plan de Mitigación / Riesgo Residual": "059669",
};

export type NivelRiesgo = "critico" | "alto" | "medio" | "bajo" | "muy_bajo";

const NIVEL_ALIAS: Record<string, NivelRiesgo> = {
  "Crítico": "critico", "critico": "critico",
  "Alto": "alto", "alto": "alto",
  "Medio": "medio", "medio": "medio",
  "Bajo": "bajo", "bajo": "bajo",
  "Muy bajo": "muy_bajo", "muy_bajo": "muy_bajo",
};

export function normalizarNivel(raw: unknown): NivelRiesgo | null {
  if (!raw || typeof raw !== "string") return null;
  return NIVEL_ALIAS[raw] ?? null;
}

export const NIVEL_LABELS: Record<NivelRiesgo, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
  muy_bajo: "Muy bajo",
};

/** Clasificación cualitativa del riesgo según la puntuación P × I (1-25). */
export function calcularNivelRiesgo(valor: number): NivelRiesgo {
  if (valor >= 20) return "critico";
  if (valor >= 12) return "alto";
  if (valor >= 6) return "medio";
  if (valor >= 3) return "bajo";
  return "muy_bajo";
}

/** Evaluación automática simplificada según criterios de riesgo y Art. 41 LOPDP. */
export function calcularRequiereEipd(params: {
  nivel: NivelRiesgo;
  catEspecialesGranEscala: boolean;
  obsSistematicaPublica: boolean;
  tratAutomatizado: boolean;
}): boolean {
  return (
    params.nivel === "critico" ||
    params.nivel === "alto" ||
    params.catEspecialesGranEscala ||
    params.obsSistematicaPublica ||
    params.tratAutomatizado
  );
}
