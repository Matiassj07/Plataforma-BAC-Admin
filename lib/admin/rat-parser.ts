import { normalizarTexto, normalizarSiNo, parsearCSVGenerico } from "./texto-plano-parser";

export interface RatResponsableExtraido {
  responsable: string;
  ruc: string;
  direccion: string;
  telefono: string;
  web: string;
  encargado: string;
}

export interface RatDpdExtraido {
  nombre: string;
  direccion: string;
  correo: string;
}

export interface ActividadRatExtraida {
  nombre_actividad: string;
  finalidad: string;
  categoria_datos: string;
  categorias_especiales: string;
  categorias_titulares: string;
  perfiles_automatizados: "" | "si" | "no";
  base_licitud: string;
  plazo_conservacion: string;
  destinatarios: string;
  transferencias_internacionales: "" | "si" | "no";
  medidas_seguridad: string;
  departamento: string;
  origen_datos: string;
  articulo_lopdp: string;
  almacenamiento: string;
  activo_informacion: string;
}

export interface RatExtraido {
  responsable: RatResponsableExtraido;
  dpd: RatDpdExtraido;
  actividades: ActividadRatExtraida[];
  lineasNoReconocidas: string[];
}

function actividadVacia(): ActividadRatExtraida {
  return {
    nombre_actividad: "",
    finalidad: "",
    categoria_datos: "",
    categorias_especiales: "",
    categorias_titulares: "",
    perfiles_automatizados: "",
    base_licitud: "",
    plazo_conservacion: "",
    destinatarios: "",
    transferencias_internacionales: "",
    medidas_seguridad: "",
    departamento: "",
    origen_datos: "",
    articulo_lopdp: "",
    almacenamiento: "",
    activo_informacion: "",
  };
}

// ---------------------------------------------------------------------------
// CSV format detection and parsing
// ---------------------------------------------------------------------------

function esFormatoCSV(texto: string): boolean {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim()).slice(0, 15);
  if (lineas.length === 0) return false;

  const commasPerLine = lineas.map((l) => (l.match(/,/g)?.length ?? 0));
  const avgCommas = commasPerLine.reduce((s, c) => s + c, 0) / lineas.length;
  if (avgCommas >= 5) return true;

  for (const linea of lineas) {
    const normL = normalizarTexto(linea);
    const commas = (linea.match(/,/g)?.length ?? 0);
    if (commas >= 5 && normL.includes("departamento") && normL.includes("finalidad")) return true;
  }

  return false;
}

function extraerEtiquetaValor(texto: string): { etiqueta: string; valor: string } | null {
  const idx = texto.indexOf(":");
  if (idx < 0) return null;
  const etiqueta = normalizarTexto(texto.slice(0, idx));
  const valor = texto.slice(idx + 1).trim();
  if (!valor) return null;
  return { etiqueta, valor };
}

function extraerResponsableDpdCSV(filas: string[][]): { responsable: RatResponsableExtraido; dpd: RatDpdExtraido } {
  const responsable: RatResponsableExtraido = { responsable: "", ruc: "", direccion: "", telefono: "", web: "", encargado: "" };
  const dpd: RatDpdExtraido = { nombre: "", direccion: "", correo: "" };

  for (let i = 0; i < Math.min(filas.length, 12); i++) {
    const fila = filas[i];
    const norm = normalizarTexto(fila.join(" "));
    if (norm.includes("departamento") && norm.includes("actividades de tratamiento")) break;

    for (const celda of fila) {
      if (!celda || !celda.includes(":")) continue;
      const par = extraerEtiquetaValor(celda);
      if (!par) continue;

      const { etiqueta, valor } = par;

      if (etiqueta.includes("nombre") || etiqueta.includes("razon social")) {
        if (!responsable.responsable && !etiqueta.includes("dpd")) {
          if (norm.includes("delegado") || norm.includes("dpd")) {
            // Row has both responsable and DPD — check column position
            const celdaIdx = fila.indexOf(celda);
            const mitad = Math.floor(fila.length / 2);
            if (celdaIdx >= mitad) {
              dpd.nombre = valor;
            } else {
              responsable.responsable = valor;
            }
          } else {
            responsable.responsable = valor;
          }
        } else if (!dpd.nombre) {
          dpd.nombre = valor;
        }
      } else if (etiqueta.includes("ruc") || etiqueta.includes("c.i") || etiqueta === "ci" || etiqueta.includes("cedula")) {
        responsable.ruc = valor;
      } else if (etiqueta.includes("correo") || etiqueta.includes("email") || etiqueta.includes("e-mail")) {
        dpd.correo = valor;
      } else if (etiqueta.includes("telefono")) {
        responsable.telefono = valor;
      } else if (etiqueta.includes("web") || etiqueta.includes("sitio")) {
        responsable.web = valor;
      } else if (etiqueta.includes("encargado")) {
        responsable.encargado = valor;
      } else if (etiqueta.includes("direccion")) {
        // Check if this is in the DPD half of the row
        const celdaIdx = fila.indexOf(celda);
        const mitad = Math.floor(fila.length / 2);
        if (celdaIdx >= mitad && !dpd.direccion) {
          dpd.direccion = valor;
        } else if (!responsable.direccion) {
          responsable.direccion = valor;
        } else if (!dpd.direccion) {
          dpd.direccion = valor;
        }
      }
    }
  }

  return { responsable, dpd };
}

interface MapaColumnasRat {
  departamento: number;
  actividad: number;
  subActividad1: number;
  subActividad2: number;
  finalidad: number;
  categoriaDatos: number;
  categoriasEspeciales: number;
  perfilesAutomatizados: number;
  categoriasTitulares: number;
  origenDatos: number;
  baseLicitud: number;
  articulo: number;
  almacenamiento: number;
  plazoConservacion: number;
  destinatarios: number;
  transferenciasInternacionales: number;
  medidasSeguridad: number;
  activoInformacion: number;
}

function encontrarEncabezadoRat(filas: string[][]): { idx: number; mapa: MapaColumnasRat } {
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const norm = filas[i].map((c) => normalizarTexto(c));
    if (norm.some((c) => c.includes("departamento")) && norm.some((c) => c.includes("finalidad"))) {
      const mapa = mapearColumnasRat(filas[i]);
      return { idx: i, mapa };
    }
  }
  return { idx: -1, mapa: mapaColumnasDefault() };
}

function mapaColumnasDefault(): MapaColumnasRat {
  return {
    departamento: 0, actividad: 1, subActividad1: 2, subActividad2: 3,
    finalidad: 4, categoriaDatos: 5, categoriasEspeciales: 6,
    perfilesAutomatizados: 7, categoriasTitulares: 8, origenDatos: 9,
    baseLicitud: 10, articulo: 11, almacenamiento: 12,
    plazoConservacion: 13, destinatarios: 14,
    transferenciasInternacionales: 15, medidasSeguridad: 16, activoInformacion: 17,
  };
}

function mapearColumnasRat(encabezado: string[]): MapaColumnasRat {
  const mapa = mapaColumnasDefault();
  const asignados = new Set<number>();

  for (let i = 0; i < encabezado.length; i++) {
    const h = normalizarTexto(encabezado[i]);
    if (!h) continue;

    if (h.includes("departamento") && !asignados.has(i)) {
      mapa.departamento = i; asignados.add(i);
    } else if ((h.includes("actividades de tratamiento") || h === "actividad") && !asignados.has(i)) {
      mapa.actividad = i; asignados.add(i);
    } else if (h.includes("finalidad") && !asignados.has(i)) {
      mapa.finalidad = i; asignados.add(i);
    } else if ((h.includes("categoria de datos") || h.includes("categorias de datos")) && !h.includes("especial")) {
      mapa.categoriaDatos = i; asignados.add(i);
    } else if (h.includes("categorias especiales") || h.includes("especiales de datos")) {
      mapa.categoriasEspeciales = i; asignados.add(i);
    } else if (h.includes("perfiles") || h.includes("elaboracion de perfiles") || h.includes("automatizado")) {
      mapa.perfilesAutomatizados = i; asignados.add(i);
    } else if (h.includes("categorias de titulares") || h.includes("titulares")) {
      mapa.categoriasTitulares = i; asignados.add(i);
    } else if (h.includes("origen de los datos") || h.includes("origen")) {
      mapa.origenDatos = i; asignados.add(i);
    } else if (h.includes("base de licitud") || h.includes("base legal")) {
      mapa.baseLicitud = i; asignados.add(i);
    } else if (h.includes("articulo") && !h.includes("ley")) {
      mapa.articulo = i; asignados.add(i);
    } else if (h.includes("almacenamiento")) {
      mapa.almacenamiento = i; asignados.add(i);
    } else if (h.includes("plazo") && h.includes("conservacion")) {
      mapa.plazoConservacion = i; asignados.add(i);
    } else if (h.includes("destinatarios")) {
      mapa.destinatarios = i; asignados.add(i);
    } else if (h.includes("transferencias internacionales") || h.includes("transferencias")) {
      mapa.transferenciasInternacionales = i; asignados.add(i);
    } else if (h.includes("medidas") && (h.includes("seguridad") || h.includes("tecnicas"))) {
      mapa.medidasSeguridad = i; asignados.add(i);
    } else if (h.includes("activo de informacion") || h.includes("activo")) {
      mapa.activoInformacion = i; asignados.add(i);
    }
  }

  // Infer sub-activity columns: columns between actividad and finalidad that weren't matched
  const actIdx = mapa.actividad;
  const finIdx = mapa.finalidad;
  if (finIdx > actIdx + 1) {
    mapa.subActividad1 = actIdx + 1;
    if (finIdx > actIdx + 2) mapa.subActividad2 = actIdx + 2;
  }

  return mapa;
}

function col(fila: string[], idx: number): string {
  if (idx < 0 || idx >= fila.length) return "";
  return fila[idx]?.trim() ?? "";
}

function normTransfIntl(valor: string): "" | "si" | "no" {
  const v = normalizarTexto(valor);
  if (!v || v === "-") return "";
  if (v.startsWith("no")) return "no";
  if (v.startsWith("si") || v.startsWith("posiblemente")) return "si";
  return "";
}

function parsearCSVRat(texto: string): RatExtraido {
  const filas = parsearCSVGenerico(texto);
  const { responsable, dpd } = extraerResponsableDpdCSV(filas);
  const { idx: encIdx, mapa } = encontrarEncabezadoRat(filas);

  const datosInicio = encIdx >= 0 ? encIdx + 1 : 0;
  const actividades: ActividadRatExtraida[] = [];

  for (let i = datosInicio; i < filas.length; i++) {
    const fila = filas[i];
    if (fila.length < 8) continue;

    const deptOrAct = col(fila, mapa.departamento) || col(fila, mapa.actividad);
    if (!deptOrAct) continue;
    // Skip empty / repeated header rows
    const normFirst = normalizarTexto(deptOrAct);
    if (normFirst.includes("departamento") || normFirst.includes("registro de actividades")) continue;

    const subAct1 = col(fila, mapa.subActividad1);
    const subAct2 = col(fila, mapa.subActividad2);
    const actNombre = col(fila, mapa.actividad);

    // Build activity name from available sub-columns
    const partes = [actNombre, subAct1, subAct2].filter(Boolean);
    let nombre = partes.length > 0 ? partes.join(" — ") : deptOrAct;

    const transferencias = col(fila, mapa.transferenciasInternacionales);

    const act: ActividadRatExtraida = {
      nombre_actividad: nombre,
      departamento: col(fila, mapa.departamento),
      finalidad: col(fila, mapa.finalidad),
      categoria_datos: col(fila, mapa.categoriaDatos),
      categorias_especiales: col(fila, mapa.categoriasEspeciales),
      perfiles_automatizados: normalizarSiNo(col(fila, mapa.perfilesAutomatizados)),
      categorias_titulares: col(fila, mapa.categoriasTitulares),
      origen_datos: col(fila, mapa.origenDatos),
      base_licitud: col(fila, mapa.baseLicitud),
      articulo_lopdp: col(fila, mapa.articulo),
      almacenamiento: col(fila, mapa.almacenamiento),
      plazo_conservacion: col(fila, mapa.plazoConservacion),
      destinatarios: col(fila, mapa.destinatarios),
      transferencias_internacionales: normTransfIntl(transferencias),
      medidas_seguridad: col(fila, mapa.medidasSeguridad),
      activo_informacion: col(fila, mapa.activoInformacion),
    };

    actividades.push(act);
  }

  return { responsable, dpd, actividades, lineasNoReconocidas: [] };
}

// ---------------------------------------------------------------------------
// Original "Etiqueta: valor" text parser
// ---------------------------------------------------------------------------

type Seccion = "responsable" | "dpd" | "actividad";

function esInicioActividad(normLinea: string): boolean {
  return /^(actividad|registro)\s*(#|n)?\s*\d+/i.test(normLinea)
    || normLinea === "actividad";
}

function asignarCampoActividad(
  act: ActividadRatExtraida,
  etiqueta: string,
  valor: string,
): boolean {
  if (
    etiqueta.includes("nombre de la actividad")
    || etiqueta === "actividad"
    || etiqueta.includes("actividad de tratamiento")
    || etiqueta.includes("actividades de tratamiento")
  ) {
    act.nombre_actividad = valor;
  } else if (
    etiqueta.includes("categorias especiales")
    || etiqueta.includes("categoria especial")
    || etiqueta.includes("categorias especiales de datos")
  ) {
    act.categorias_especiales = valor;
  } else if (
    etiqueta.includes("categorias de titulares")
    || etiqueta.includes("categorias titulares")
    || etiqueta.includes("categoria de titulares")
  ) {
    act.categorias_titulares = valor;
  } else if (
    (etiqueta.includes("categoria de datos") || etiqueta.includes("categorias de datos") || etiqueta.includes("categoria datos"))
    && !etiqueta.includes("especial")
  ) {
    act.categoria_datos = valor;
  } else if (
    etiqueta.includes("perfiles automatizados")
    || etiqueta.includes("perfilamiento")
    || etiqueta.includes("elaboracion de perfiles")
  ) {
    act.perfiles_automatizados = normalizarSiNo(valor);
  } else if (etiqueta.includes("base de licitud") || etiqueta.includes("base legal")) {
    act.base_licitud = valor;
  } else if (etiqueta.includes("articulo")) {
    act.articulo_lopdp = valor;
  } else if (etiqueta.includes("plazo de conservacion") || etiqueta.includes("plazo")) {
    act.plazo_conservacion = valor;
  } else if (etiqueta.includes("destinatarios")) {
    act.destinatarios = valor;
  } else if (
    etiqueta.includes("transferencias internacionales")
    || etiqueta.includes("transferencia internacional")
  ) {
    act.transferencias_internacionales = normTransfIntl(valor);
  } else if (
    etiqueta.includes("medidas de seguridad")
    || etiqueta.includes("medidas tecnicas")
    || etiqueta.includes("medidas tecnicas y organizativas")
  ) {
    act.medidas_seguridad = valor;
  } else if (etiqueta.includes("origen de los datos") || etiqueta === "origen") {
    act.origen_datos = valor;
  } else if (etiqueta.includes("almacenamiento")) {
    act.almacenamiento = valor;
  } else if (etiqueta.includes("activo de informacion") || (etiqueta.includes("activo") && !etiqueta.includes("actividad"))) {
    act.activo_informacion = valor;
  } else if (etiqueta.includes("finalidad")) {
    act.finalidad = valor;
  } else if (etiqueta.includes("departamento")) {
    act.departamento = valor;
  } else if (
    etiqueta.includes("descripcion")
    || etiqueta.includes("detalle de la actividad")
    || etiqueta.includes("descripcion / detalle")
  ) {
    if (act.finalidad) {
      act.finalidad = `${act.finalidad}. ${valor}`;
    } else {
      act.finalidad = valor;
    }
  } else if (
    etiqueta.includes("categoria / proceso")
    || etiqueta.includes("proceso de tratamiento")
  ) {
    if (!act.nombre_actividad) act.nombre_actividad = valor;
  } else {
    return false;
  }
  return true;
}

function asignarCampoResponsable(
  responsable: RatResponsableExtraido,
  etiqueta: string,
  valor: string,
): boolean {
  if (
    etiqueta.includes("nombre de la empresa")
    || etiqueta.includes("razon social")
    || etiqueta === "empresa"
    || etiqueta === "nombre"
  ) {
    responsable.responsable = valor;
  } else if (etiqueta.includes("ruc") || etiqueta.includes("c.i") || etiqueta === "ci" || etiqueta.includes("cedula")) {
    responsable.ruc = valor;
  } else if (etiqueta.includes("telefono")) {
    responsable.telefono = valor;
  } else if (etiqueta.includes("web") || etiqueta.includes("sitio")) {
    responsable.web = valor;
  } else if (etiqueta.includes("encargado")) {
    responsable.encargado = valor;
  } else if (etiqueta.includes("direccion")) {
    responsable.direccion = valor;
  } else {
    return false;
  }
  return true;
}

function asignarCampoDpd(
  dpd: RatDpdExtraido,
  etiqueta: string,
  valor: string,
): boolean {
  if (etiqueta.includes("correo") || etiqueta.includes("email") || etiqueta.includes("e-mail")) {
    dpd.correo = valor;
  } else if (etiqueta.includes("direccion")) {
    dpd.direccion = valor;
  } else if (etiqueta.includes("nombre")) {
    dpd.nombre = valor;
  } else {
    return false;
  }
  return true;
}

function parsearTextoEtiquetaValorRat(texto: string): RatExtraido {
  const responsable: RatResponsableExtraido = {
    responsable: "",
    ruc: "",
    direccion: "",
    telefono: "",
    web: "",
    encargado: "",
  };
  const dpd: RatDpdExtraido = { nombre: "", direccion: "", correo: "" };
  const actividades: ActividadRatExtraida[] = [];
  const lineasNoReconocidas: string[] = [];

  let seccion: Seccion = "responsable";
  let actividadActual: ActividadRatExtraida | null = null;

  const lineas = texto.split(/\r?\n/);

  for (let li = 0; li < lineas.length; li++) {
    const lineaOriginal = lineas[li];
    const linea = lineaOriginal.trim();
    if (!linea || /^[=]{3,}$/.test(linea)) continue;
    const normLinea = normalizarTexto(linea);

    // Detect section headers (lines with or without colons)
    if (normLinea.includes("responsable de tratamiento")) {
      seccion = "responsable";
      continue;
    }
    if (
      normLinea.includes("delegado de proteccion")
      || normLinea.includes("proteccion de datos")
      || normLinea.includes("delegado de proteccion de datos")
    ) {
      seccion = "dpd";
      continue;
    }
    if (
      normLinea.includes("actividades de tratamiento")
      && !normLinea.includes(":")
      && !normLinea.includes("registro")
    ) {
      continue;
    }

    // Detect activity/registro boundaries
    if (esInicioActividad(normLinea)) {
      seccion = "actividad";
      if (actividadActual) actividades.push(actividadActual);
      actividadActual = actividadVacia();
      continue;
    }

    // Skip separator lines
    if (/^[-]{3,}$/.test(linea)) {
      if (seccion === "actividad") {
        if (actividadActual && actividadActual.nombre_actividad) {
          actividades.push(actividadActual);
        }
        actividadActual = actividadVacia();
      }
      continue;
    }

    if (!linea.includes(":")) continue;

    const idx = linea.indexOf(":");
    const etiqueta = normalizarTexto(linea.slice(0, idx));
    const valor = linea.slice(idx + 1).trim();
    if (!valor) continue;

    if (seccion === "responsable") {
      if (!asignarCampoResponsable(responsable, etiqueta, valor)) {
        if (!asignarCampoDpd(dpd, etiqueta, valor)) {
          lineasNoReconocidas.push(lineaOriginal.trim());
        }
      }
      continue;
    }

    if (seccion === "dpd") {
      if (!asignarCampoDpd(dpd, etiqueta, valor)) {
        lineasNoReconocidas.push(lineaOriginal.trim());
      }
      continue;
    }

    // seccion === "actividad"
    if (!actividadActual) actividadActual = actividadVacia();
    if (!asignarCampoActividad(actividadActual, etiqueta, valor)) {
      lineasNoReconocidas.push(lineaOriginal.trim());
    }
  }

  if (actividadActual && actividadActual.nombre_actividad) actividades.push(actividadActual);

  return { responsable, dpd, actividades, lineasNoReconocidas };
}

// ---------------------------------------------------------------------------
// Public API — auto-detects format
// ---------------------------------------------------------------------------

export function parsearTextoRat(texto: string): RatExtraido {
  if (esFormatoCSV(texto)) {
    return parsearCSVRat(texto);
  }
  return parsearTextoEtiquetaValorRat(texto);
}

export function generarPlantillaRatTxt(): string {
  return `RESPONSABLE DE TRATAMIENTO
Nombre de la empresa: Clínica Santa María
RUC: 1234567890001
Dirección: Av. Amazonas y Naciones Unidas, Quito
Teléfono: 022345678
Sitio web: www.clinicasantamaria.ec
Encargado de Tratamiento: Proveedor de Hosting XYZ

DELEGADO DE PROTECCIÓN DE DATOS
Nombre del DPD: Juan Pérez
Dirección del DPD: Av. 6 de Diciembre N34-11, Quito
Correo del DPD: dpd@clinicasantamaria.ec

ACTIVIDAD 1
Nombre de la actividad: Gestión de Nómina
Departamento: Recursos Humanos
Finalidad: Pago de sueldos y beneficios de ley a los empleados
Categoría de Datos: identificativos, financieros
Categorías de Titulares: empleados
Categorías Especiales: Ninguna
Perfiles automatizados: No
Base de Licitud: Ejecución de un contrato
Artículo LOPDP: Art. 7
Plazo de Conservación: 7 años
Destinatarios: SRI, IESS
Transferencias Internacionales: No
Medidas de Seguridad: Cifrado de base de datos, control de acceso por roles
Origen de los Datos: Formulario de contratación
Almacenamiento: Servidor local
Activo de Información: Sistema de nómina interno

ACTIVIDAD 2
Nombre de la actividad: Atención al paciente
Departamento: Admisiones
Finalidad: Registro y seguimiento de historiales clínicos
Categoría de Datos: identificativos, datos de salud
Categorías de Titulares: pacientes
Categorías Especiales: Datos de salud
Perfiles automatizados: No
Base de Licitud: Consentimiento del titular
Artículo LOPDP: Art. 26
Plazo de Conservación: 10 años
Destinatarios: Aseguradoras (con consentimiento)
Transferencias Internacionales: No
Medidas de Seguridad: Acceso restringido por perfil médico
Origen de los Datos: Formulario de ingreso del paciente
Almacenamiento: Servidor local cifrado
Activo de Información: Sistema de historia clínica
`;
}
