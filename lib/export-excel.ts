import type { ActividadRat, ActividadRiesgo } from "@/lib/admin/expediente";
import { COLUMNAS_RAT, celdaRat } from "@/lib/rat-format";
import { COLUMNAS_RIESGO, GRUPOS_RIESGO, GRUPO_HEX, NIVEL_HEX, celdaRiesgo, normalizarNivel } from "@/lib/riesgos-format";

const BAC_RED = "D2122E";
const BORDE = { style: "thin" as const, color: { argb: "FFE4E7EC" } };
const BORDES_CELDA = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };

async function descargarWorkbook(workbook: import("exceljs").Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarRatXlsx(params: {
  nombreEmpresa: string;
  version: number;
  responsable: { nombre?: string; ruc?: string; direccion?: string; encargado?: string };
  dpd: { nombre?: string; direccion?: string; correo?: string };
  actividades: ActividadRat[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("RAT");
  const totalCols = COLUMNAS_RAT.length;

  ws.mergeCells(1, 1, 1, totalCols);
  const titulo = ws.getCell(1, 1);
  titulo.value = `REGISTRO DE ACTIVIDADES DE TRATAMIENTO (RAT) — ${params.nombreEmpresa.toUpperCase()}`;
  titulo.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BAC_RED}` } };
  titulo.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  const mitad = Math.ceil(totalCols / 2);
  ws.mergeCells(2, 1, 2, mitad);
  ws.mergeCells(2, mitad + 1, 2, totalCols);
  ws.getCell(2, 1).value = "RESPONSABLE DE TRATAMIENTO";
  ws.getCell(2, mitad + 1).value = "DELEGADO DE PROTECCIÓN DE DATOS (DPD)";
  ws.mergeCells(3, 1, 3, mitad);
  ws.mergeCells(3, mitad + 1, 3, totalCols);
  ws.getCell(3, 1).value =
    `${params.responsable.nombre ?? params.nombreEmpresa}  ·  RUC: ${params.responsable.ruc ?? "—"}  ·  Dirección: ${params.responsable.direccion ?? "—"}  ·  Encargado de Tratamiento: ${params.responsable.encargado ?? "—"}`;
  ws.getCell(3, mitad + 1).value =
    `Nombre: ${params.dpd.nombre ?? "—"}  ·  Dirección: ${params.dpd.direccion ?? "—"}  ·  Correo: ${params.dpd.correo ?? "—"}`;
  for (const [r, c] of [
    [2, 1],
    [2, mitad + 1],
    [3, 1],
    [3, mitad + 1],
  ] as const) {
    const cell = ws.getCell(r, c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F4F7" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.font = r === 2 ? { bold: true, size: 10 } : { size: 9 };
  }
  ws.getRow(3).height = 28;

  const headerRowIdx = 5;
  const headerRow = ws.getRow(headerRowIdx);
  COLUMNAS_RAT.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BAC_RED}` } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDES_CELDA;
  });
  headerRow.height = 32;

  params.actividades.forEach((a, rIdx) => {
    const row = ws.getRow(headerRowIdx + 1 + rIdx);
    COLUMNAS_RAT.forEach((c, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = celdaRat(a[c.key]);
      cell.font = { size: 9 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = BORDES_CELDA;
      if (rIdx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FC" } };
      }
    });
  });

  ws.columns.forEach((col) => {
    col.width = 22;
  });

  await descargarWorkbook(wb, `rat-${params.nombreEmpresa}-v${params.version}.xlsx`);
}

export async function exportarMatrizXlsx(params: {
  nombreEmpresa: string;
  version: number;
  actividades: ActividadRiesgo[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Matriz de Riesgos");

  ws.mergeCells(1, 1, 1, COLUMNAS_RIESGO.length);
  const titulo = ws.getCell(1, 1);
  titulo.value = `MATRIZ DE RIESGOS DE PROTECCIÓN DE DATOS — ${params.nombreEmpresa.toUpperCase()}`;
  titulo.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titulo.alignment = { vertical: "middle" };
  ws.getRow(1).height = 24;

  const grupoRowIdx = 3;
  const labelRowIdx = 4;
  let colCursor = 1;
  for (const grupo of GRUPOS_RIESGO) {
    const inicio = colCursor;
    const fin = colCursor + grupo.columnas.length - 1;
    if (fin > inicio) ws.mergeCells(grupoRowIdx, inicio, grupoRowIdx, fin);
    const cell = ws.getCell(grupoRowIdx, inicio);
    cell.value = grupo.titulo;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GRUPO_HEX[grupo.titulo]}` } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    colCursor = fin + 1;
  }
  ws.getRow(grupoRowIdx).height = 20;

  const labelRow = ws.getRow(labelRowIdx);
  COLUMNAS_RIESGO.forEach((c, i) => {
    const cell = labelRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, size: 8 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F4F7" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDES_CELDA;
  });
  labelRow.height = 40;

  params.actividades.forEach((a, rIdx) => {
    const row = ws.getRow(labelRowIdx + 1 + rIdx);
    COLUMNAS_RIESGO.forEach((c, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = celdaRiesgo(a, c.key);
      cell.font = { size: 8 };
      cell.alignment = { vertical: "top", wrapText: true, horizontal: "center" };
      cell.border = BORDES_CELDA;

      if (c.key === "riesgo_inherente" || c.key === "riesgo_residual") {
        const nivel = normalizarNivel(c.key === "riesgo_inherente" ? a.nivel_riesgo : a.nivel_riesgo_residual);
        const hex = nivel ? NIVEL_HEX[nivel] : null;
        if (hex) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } };
          cell.font = { size: 8, bold: true, color: { argb: "FFFFFFFF" } };
        }
      } else if (rIdx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FC" } };
      }
    });
  });

  ws.columns.forEach((col) => {
    col.width = 18;
  });

  await descargarWorkbook(wb, `matriz-riesgos-${params.nombreEmpresa}-v${params.version}.xlsx`);
}
