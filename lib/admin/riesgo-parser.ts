import { normalizarTexto, normalizarSiNo, extraerNumero1a5, parsearCSVGenerico } from "./texto-plano-parser";
import type { ActividadRat } from "./expediente";

export interface RiesgoExtraido {
  actividad_nombre: string;
  actividad_rat_id: string;
  codigo: string;
  area_departamento: string;
  amenazas: string;
  vulnerabilidades: string;
  probabilidad: string;
  impacto: string;
  cat_especiales_gran_escala: boolean;
  obs_sistematica_publica: boolean;
  trat_automatizado: boolean;
  activos_relacionados: string;
  base_legal: string;
  articulo_ley: string;
  medidas_implementadas: string;
  nivel_riesgo: string;
  requiere_eipd: boolean;
  medidas_implementar: string;
  prob_residual: string;
  imp_residual: string;
  nivel_riesgo_residual: string;
  semaforo: "" | "rojo" | "amarillo" | "verde";
  responsable_implementacion: string;
}

function riesgoVacio(): RiesgoExtraido {
  return {
    actividad_nombre: "",
    actividad_rat_id: "",
    codigo: "",
    area_departamento: "",
    amenazas: "",
    vulnerabilidades: "",
    probabilidad: "",
    impacto: "",
    cat_especiales_gran_escala: false,
    obs_sistematica_publica: false,
    trat_automatizado: false,
    activos_relacionados: "",
    base_legal: "",
    articulo_ley: "",
    medidas_implementadas: "",
    nivel_riesgo: "",
    requiere_eipd: false,
    medidas_implementar: "",
    prob_residual: "",
    imp_residual: "",
    nivel_riesgo_residual: "",
    semaforo: "",
    responsable_implementacion: "",
  };
}

function normalizarSemaforo(valor: string): "" | "rojo" | "amarillo" | "verde" {
  const v = normalizarTexto(valor);
  if (v.includes("rojo") || v.includes("critico")) return "rojo";
  if (v.includes("amarillo") || v.includes("alto") || v.includes("medio")) return "amarillo";
  if (v.includes("verde") || v.includes("bajo") || v.includes("muy bajo")) return "verde";
  return "";
}

function semaforoDesdeNivel(nivel: string): "" | "rojo" | "amarillo" | "verde" {
  const v = normalizarTexto(nivel);
  if (v.includes("critico")) return "rojo";
  if (v.includes("alto")) return "rojo";
  if (v.includes("medio")) return "amarillo";
  if (v.includes("bajo")) return "verde";
  return "";
}

function esSiNo(valor: string): boolean {
  const v = normalizarTexto(valor);
  return v === "si" || v === "sí" || v === "yes";
}

function esFormatoCSV(texto: string): boolean {
  const primerasLineas = texto.split(/\r?\n/).slice(0, 10).join("\n");
  const norm = normalizarTexto(primerasLineas);
  if (norm.includes("codigo") && (norm.includes("area") || norm.includes("departamento")) && norm.includes("amenazas")) {
    return true;
  }
  if (norm.includes("matriz de riesgos")) return true;
  const commaLines = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 5);
  const avgCommas = commaLines.reduce((sum, l) => sum + (l.match(/,/g)?.length ?? 0), 0) / (commaLines.length || 1);
  return avgCommas >= 8;
}

function encontrarFilaEncabezado(filas: string[][]): number {
  for (let i = 0; i < Math.min(filas.length, 10); i++) {
    const norm = filas[i].map((c) => normalizarTexto(c));
    if (norm.some((c) => c.includes("codigo")) && norm.some((c) => c.includes("amenazas"))) {
      return i;
    }
  }
  return -1;
}

interface MapaColumnas {
  codigo: number;
  area: number;
  actividad: number;
  catEspeciales: number;
  obsSistematica: number;
  tratAutomatizado: number;
  activos: number;
  baseLegal: number;
  articulo: number;
  amenazas: number;
  vulnerabilidades: number;
  medidasImpl: number;
  probabilidad: number;
  impacto: number;
  riesgoInherente: number;
  nivelRiesgo: number;
  requiereEipd: number;
  medidasNuevas: number;
  probResidual: number;
  impResidual: number;
  riesgoResidual: number;
  nivelResidual: number;
  responsable: number;
}

function mapearColumnas(encabezado: string[]): MapaColumnas {
  const mapa: MapaColumnas = {
    codigo: -1, area: -1, actividad: -1, catEspeciales: -1, obsSistematica: -1,
    tratAutomatizado: -1, activos: -1, baseLegal: -1, articulo: -1, amenazas: -1,
    vulnerabilidades: -1, medidasImpl: -1, probabilidad: -1, impacto: -1,
    riesgoInherente: -1, nivelRiesgo: -1, requiereEipd: -1, medidasNuevas: -1,
    probResidual: -1, impResidual: -1, riesgoResidual: -1, nivelResidual: -1,
    responsable: -1,
  };

  for (let i = 0; i < encabezado.length; i++) {
    const h = normalizarTexto(encabezado[i]);

    if (h.includes("codigo") || h === "cod") {
      mapa.codigo = i;
    } else if ((h.includes("area") || h.includes("departamento")) && !h.includes("actividad")) {
      mapa.area = i;
    } else if (h.includes("actividad") && (h.includes("tratamiento") || h.includes("actividad de"))) {
      mapa.actividad = i;
    } else if (h.includes("categorias especiales") || h.includes("cat") && h.includes("especial")) {
      mapa.catEspeciales = i;
    } else if (h.includes("observacion sistematica") || h.includes("obs") && h.includes("sistematica")) {
      mapa.obsSistematica = i;
    } else if (h.includes("tratamiento automatizado") || h.includes("trat") && h.includes("automatiz")) {
      mapa.tratAutomatizado = i;
    } else if (h.includes("activos") && (h.includes("informacion") || h.includes("relacionados"))) {
      mapa.activos = i;
    } else if (h.includes("base legal") || h.includes("base") && h.includes("normativa")) {
      mapa.baseLegal = i;
    } else if (h.includes("articulo") || h.includes("ley especifica")) {
      mapa.articulo = i;
    } else if (h.includes("amenazas")) {
      mapa.amenazas = i;
    } else if (h.includes("vulnerabilidades")) {
      mapa.vulnerabilidades = i;
    } else if (h.includes("medidas") && (h.includes("ya") || h.includes("implementadas"))) {
      mapa.medidasImpl = i;
    } else if (h.includes("probabilidad") && !h.includes("residual")) {
      mapa.probabilidad = i;
    } else if (h.includes("impacto") && !h.includes("residual")) {
      mapa.impacto = i;
    } else if (h.includes("riesgo") && h.includes("inherente")) {
      mapa.riesgoInherente = i;
    } else if (h.includes("nivel") && h.includes("riesgo") && !h.includes("residual")) {
      mapa.nivelRiesgo = i;
    } else if (h.includes("eipd") || h.includes("requiere eipd")) {
      mapa.requiereEipd = i;
    } else if (h.includes("medidas") && (h.includes("implementar") || h.includes("controles nuevos") || h.includes("mitigacion"))) {
      mapa.medidasNuevas = i;
    } else if ((h.includes("prob") && h.includes("residual")) || h === "prob. residual") {
      mapa.probResidual = i;
    } else if ((h.includes("imp") && h.includes("residual")) || h === "imp. residual") {
      mapa.impResidual = i;
    } else if (h.includes("riesgo") && h.includes("residual") && !h.includes("nivel")) {
      mapa.riesgoResidual = i;
    } else if (h.includes("nivel") && h.includes("residual")) {
      mapa.nivelResidual = i;
    } else if (h.includes("responsable")) {
      mapa.responsable = i;
    }
  }

  // Fallback: if headers weren't matched, try positional for the standard 23-column format
  if (mapa.codigo === -1 && encabezado.length >= 20) {
    mapa.codigo = 0;
    mapa.area = 1;
    mapa.actividad = 2;
    mapa.catEspeciales = 3;
    mapa.obsSistematica = 4;
    mapa.tratAutomatizado = 5;
    mapa.activos = 6;
    mapa.baseLegal = 7;
    mapa.articulo = 8;
    mapa.amenazas = 9;
    mapa.vulnerabilidades = 10;
    mapa.medidasImpl = 11;
    mapa.probabilidad = 12;
    mapa.impacto = 13;
    mapa.riesgoInherente = 14;
    mapa.nivelRiesgo = 15;
    mapa.requiereEipd = 16;
    mapa.medidasNuevas = 17;
    mapa.probResidual = 18;
    mapa.impResidual = 19;
    mapa.riesgoResidual = 20;
    mapa.nivelResidual = 21;
    mapa.responsable = 22;
  }

  return mapa;
}

function col(fila: string[], idx: number): string {
  if (idx < 0 || idx >= fila.length) return "";
  return fila[idx]?.trim() ?? "";
}

function parsearCSVRiesgos(texto: string): RiesgoExtraido[] {
  const filas = parsearCSVGenerico(texto);
  const idxEnc = encontrarFilaEncabezado(filas);

  let encabezado: string[];
  let datosInicio: number;

  if (idxEnc >= 0) {
    encabezado = filas[idxEnc];
    datosInicio = idxEnc + 1;
  } else {
    encabezado = [];
    datosInicio = 0;
    // Skip title/metadata rows (fewer than 8 non-empty columns)
    while (datosInicio < filas.length && filas[datosInicio].filter((c) => c).length < 8) {
      datosInicio++;
    }
  }

  const mapa = mapearColumnas(encabezado);
  const riesgos: RiesgoExtraido[] = [];

  for (let i = datosInicio; i < filas.length; i++) {
    const fila = filas[i];
    // Skip empty rows, section separators, or criteria tables
    if (fila.length < 8) continue;
    const codigo = col(fila, mapa.codigo);
    if (!codigo || normalizarTexto(codigo).includes("criterios") || normalizarTexto(codigo).includes("nivel")) continue;

    const nivelRiesgo = col(fila, mapa.nivelRiesgo);
    const nivelResidual = col(fila, mapa.nivelResidual);

    const r: RiesgoExtraido = {
      ...riesgoVacio(),
      codigo,
      area_departamento: col(fila, mapa.area),
      actividad_nombre: col(fila, mapa.actividad),
      cat_especiales_gran_escala: esSiNo(col(fila, mapa.catEspeciales)),
      obs_sistematica_publica: esSiNo(col(fila, mapa.obsSistematica)),
      trat_automatizado: esSiNo(col(fila, mapa.tratAutomatizado)),
      activos_relacionados: col(fila, mapa.activos),
      base_legal: col(fila, mapa.baseLegal),
      articulo_ley: col(fila, mapa.articulo),
      amenazas: col(fila, mapa.amenazas),
      vulnerabilidades: col(fila, mapa.vulnerabilidades),
      medidas_implementadas: col(fila, mapa.medidasImpl),
      probabilidad: extraerNumero1a5(col(fila, mapa.probabilidad)),
      impacto: extraerNumero1a5(col(fila, mapa.impacto)),
      nivel_riesgo: nivelRiesgo,
      requiere_eipd: esSiNo(col(fila, mapa.requiereEipd)),
      medidas_implementar: col(fila, mapa.medidasNuevas),
      prob_residual: extraerNumero1a5(col(fila, mapa.probResidual)),
      imp_residual: extraerNumero1a5(col(fila, mapa.impResidual)),
      nivel_riesgo_residual: nivelResidual,
      semaforo: semaforoDesdeNivel(nivelResidual || nivelRiesgo),
      responsable_implementacion: col(fila, mapa.responsable),
    };

    riesgos.push(r);
  }

  return riesgos;
}

// ---------------------------------------------------------------------------
// Original "Etiqueta: valor" text parser
// ---------------------------------------------------------------------------

function parsearTextoEtiquetaValor(texto: string): RiesgoExtraido[] {
  const riesgos: RiesgoExtraido[] = [];
  let actual: RiesgoExtraido | null = null;

  for (const lineaOriginal of texto.split(/\r?\n/)) {
    const linea = lineaOriginal.trim();
    if (!linea) continue;
    const normLinea = normalizarTexto(linea);

    if (!linea.includes(":")) {
      if (/^riesgo\b/.test(normLinea)) {
        if (actual) riesgos.push(actual);
        actual = riesgoVacio();
      }
      continue;
    }

    if (!actual) actual = riesgoVacio();

    const idx = linea.indexOf(":");
    const etiqueta = normalizarTexto(linea.slice(0, idx));
    const valor = linea.slice(idx + 1).trim();
    if (!valor) continue;

    if (etiqueta.includes("actividad")) {
      actual.actividad_nombre = valor;
    } else if (etiqueta.includes("codigo")) {
      actual.codigo = valor;
    } else if (etiqueta.includes("area") || etiqueta.includes("departamento")) {
      actual.area_departamento = valor;
    } else if (etiqueta.includes("amenazas")) {
      actual.amenazas = valor;
    } else if (etiqueta.includes("vulnerabilidades")) {
      actual.vulnerabilidades = valor;
    } else if (etiqueta.includes("categorias especiales")) {
      actual.cat_especiales_gran_escala = normalizarSiNo(valor) === "si";
    } else if (etiqueta.includes("observacion sistematica") || etiqueta.includes("obs sistematica")) {
      actual.obs_sistematica_publica = normalizarSiNo(valor) === "si";
    } else if (etiqueta.includes("tratamiento automatizado")) {
      actual.trat_automatizado = normalizarSiNo(valor) === "si";
    } else if (etiqueta.includes("activos")) {
      actual.activos_relacionados = valor;
    } else if (etiqueta.includes("base legal") || etiqueta.includes("base de licitud")) {
      actual.base_legal = valor;
    } else if (etiqueta.includes("articulo")) {
      actual.articulo_ley = valor;
    } else if (etiqueta.includes("medidas ya implementadas") || etiqueta.includes("medidas implementadas")) {
      actual.medidas_implementadas = valor;
    } else if (etiqueta.includes("probabilidad residual")) {
      actual.prob_residual = extraerNumero1a5(valor);
    } else if (etiqueta.includes("impacto residual")) {
      actual.imp_residual = extraerNumero1a5(valor);
    } else if (etiqueta.includes("probabilidad")) {
      actual.probabilidad = extraerNumero1a5(valor);
    } else if (etiqueta.includes("impacto")) {
      actual.impacto = extraerNumero1a5(valor);
    } else if (etiqueta.includes("medidas a implementar") || etiqueta.includes("medidas nuevas")) {
      actual.medidas_implementar = valor;
    } else if (etiqueta.includes("nivel de riesgo") && etiqueta.includes("residual")) {
      actual.nivel_riesgo_residual = valor;
    } else if (etiqueta.includes("nivel de riesgo") || etiqueta.includes("nivel riesgo")) {
      actual.nivel_riesgo = valor;
    } else if (etiqueta.includes("requiere eipd") || etiqueta.includes("eipd")) {
      actual.requiere_eipd = normalizarSiNo(valor) === "si";
    } else if (etiqueta.includes("semaforo")) {
      actual.semaforo = normalizarSemaforo(valor);
    } else if (etiqueta.includes("responsable")) {
      actual.responsable_implementacion = valor;
    }
  }
  if (actual) riesgos.push(actual);
  return riesgos;
}

// ---------------------------------------------------------------------------
// Public API — auto-detects format
// ---------------------------------------------------------------------------

export function parsearTextoRiesgos(texto: string): RiesgoExtraido[] {
  if (esFormatoCSV(texto)) {
    return parsearCSVRiesgos(texto);
  }
  return parsearTextoEtiquetaValor(texto);
}

function extraerPalabrasRelevantes(texto: string): string[] {
  const stopWords = new Set([
    "de", "del", "la", "las", "los", "el", "en", "y", "a", "al", "con", "por",
    "para", "un", "una", "su", "sus", "es", "que", "no", "si", "se", "o",
  ]);
  return normalizarTexto(texto)
    .split(/[\s—\-–/,;.()]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function similitudPalabras(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let coincidencias = 0;
  for (const palabra of a) {
    if (setB.has(palabra)) {
      coincidencias++;
    } else {
      for (const pb of b) {
        if (pb.length > 4 && palabra.length > 4 && (pb.includes(palabra) || palabra.includes(pb))) {
          coincidencias += 0.7;
          break;
        }
      }
    }
  }
  return coincidencias / Math.max(a.length, b.length);
}

export function vincularActividadesRiesgo(
  riesgos: RiesgoExtraido[],
  ratActividades: ActividadRat[]
): RiesgoExtraido[] {
  const ratNormalizados = ratActividades.map((a) => ({
    id: a.id,
    nombre: normalizarTexto(a.nombre_actividad ?? ""),
    palabras: extraerPalabrasRelevantes(a.nombre_actividad ?? ""),
    departamento: normalizarTexto(a.departamento ?? ""),
  }));

  return riesgos.map((r) => {
    if (!r.actividad_nombre) return r;
    const objetivo = normalizarTexto(r.actividad_nombre);
    const palabrasObj = extraerPalabrasRelevantes(r.actividad_nombre);
    const deptObj = normalizarTexto(r.area_departamento);

    // Exact match
    const exacto = ratNormalizados.find((a) => a.nombre === objetivo);
    if (exacto) return { ...r, actividad_rat_id: exacto.id };

    // Substring match
    const substr = ratNormalizados.find((a) => a.nombre && (a.nombre.includes(objetivo) || objetivo.includes(a.nombre)));
    if (substr) return { ...r, actividad_rat_id: substr.id };

    // Keyword similarity — pick best match above threshold
    let mejorScore = 0;
    let mejorId = "";
    for (const a of ratNormalizados) {
      let score = similitudPalabras(palabrasObj, a.palabras);
      // Boost if departments match
      if (deptObj && a.departamento && (deptObj.includes(a.departamento) || a.departamento.includes(deptObj))) {
        score += 0.15;
      }
      if (score > mejorScore) {
        mejorScore = score;
        mejorId = a.id;
      }
    }

    if (mejorScore >= 0.35 && mejorId) {
      return { ...r, actividad_rat_id: mejorId };
    }

    return r;
  });
}

export function generarPlantillaRiesgosTxt(ratActividades: ActividadRat[]): string {
  const nombreEjemplo1 = ratActividades[0]?.nombre_actividad || "Gestión de Nómina";
  const nombreEjemplo2 = ratActividades[1]?.nombre_actividad || "Atención al paciente";
  return `RIESGO 1
Actividad de Tratamiento: ${nombreEjemplo1}
Código: RIES-01
Área/Departamento: Recursos Humanos
Amenazas: Acceso no autorizado a la base de datos de nómina
Vulnerabilidades: Falta de cifrado en los respaldos
Probabilidad: 3
Impacto: 4
Categorías especiales a gran escala: No
Observación sistemática pública: No
Medidas a Implementar: Cifrar respaldos e implementar autenticación multifactor
Probabilidad Residual: 2
Impacto Residual: 2
Semáforo: Amarillo
Responsable de Implementación: Jefe de TI

RIESGO 2
Actividad de Tratamiento: ${nombreEjemplo2}
Código: RIES-02
Área/Departamento: Admisiones
Amenazas: Divulgación indebida de historiales clínicos
Vulnerabilidades: Acceso compartido entre varios perfiles sin restricción
Probabilidad: 2
Impacto: 5
Categorías especiales a gran escala: Sí
Observación sistemática pública: No
Medidas a Implementar: Restringir acceso por perfil médico y registrar auditoría de accesos
Probabilidad Residual: 1
Impacto Residual: 3
Semáforo: Verde
Responsable de Implementación: Jefe de Sistemas
`;
}
