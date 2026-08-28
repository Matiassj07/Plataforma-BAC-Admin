import type { ActividadRat, ActividadRiesgo } from "@/lib/admin/expediente";
import { COLUMNAS_RAT, celdaRat } from "@/lib/rat-format";
import { COLUMNAS_RIESGO, GRUPOS_RIESGO, GRUPO_HEX, NIVEL_HEX, celdaRiesgo, normalizarNivel } from "@/lib/riesgos-format";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const BAC_RED_RGB = hexToRgb("D2122E");

export async function exportarRatPdf(params: {
  nombreEmpresa: string;
  version: number;
  responsable: { nombre?: string; ruc?: string; direccion?: string; encargado?: string };
  dpd: { nombre?: string; direccion?: string; correo?: string };
  actividades: ActividadRat[];
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", format: "a3" });

  doc.setFillColor(...BAC_RED_RGB);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(
    `REGISTRO DE ACTIVIDADES DE TRATAMIENTO (RAT) — ${params.nombreEmpresa.toUpperCase()}`,
    10,
    10
  );

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.text("Responsable de Tratamiento:", 10, 24);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${params.responsable.nombre ?? params.nombreEmpresa}  ·  RUC: ${params.responsable.ruc ?? "—"}  ·  Dirección: ${params.responsable.direccion ?? "—"}  ·  Encargado: ${params.responsable.encargado ?? "—"}`,
    10,
    29
  );
  doc.setFont("helvetica", "bold");
  doc.text("Delegado de Protección de Datos (DPD):", 150, 24);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Nombre: ${params.dpd.nombre ?? "—"}  ·  Dirección: ${params.dpd.direccion ?? "—"}  ·  Correo: ${params.dpd.correo ?? "—"}`,
    150,
    29
  );

  autoTable(doc, {
    startY: 34,
    head: [COLUMNAS_RAT.map((c) => c.label)],
    body: params.actividades.map((a) => COLUMNAS_RAT.map((c) => celdaRat(a[c.key]))),
    styles: { fontSize: 6, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: BAC_RED_RGB, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 252] },
  });

  doc.save(`rat-${params.nombreEmpresa}-v${params.version}.pdf`);
}

export async function exportarMatrizPdf(params: {
  nombreEmpresa: string;
  version: number;
  actividades: ActividadRiesgo[];
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", format: "a3" });
  const azul = hexToRgb("1E3A8A");

  doc.setFillColor(...azul);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(`MATRIZ DE RIESGOS DE PROTECCIÓN DE DATOS — ${params.nombreEmpresa.toUpperCase()}`, 10, 10);

  const filaGrupos = GRUPOS_RIESGO.map((g) => ({
    content: g.titulo,
    colSpan: g.columnas.length,
    styles: {
      fillColor: hexToRgb(GRUPO_HEX[g.titulo]),
      textColor: [255, 255, 255] as [number, number, number],
      halign: "center" as const,
    },
  }));
  const filaLabels = COLUMNAS_RIESGO.map((c) => c.label);

  const riesgoInherenteIdx = COLUMNAS_RIESGO.findIndex((c) => c.key === "riesgo_inherente");
  const riesgoResidualIdx = COLUMNAS_RIESGO.findIndex((c) => c.key === "riesgo_residual");

  autoTable(doc, {
    startY: 22,
    head: [filaGrupos, filaLabels],
    body: params.actividades.map((a) => COLUMNAS_RIESGO.map((c) => celdaRiesgo(a, c.key))),
    styles: { fontSize: 6, cellPadding: 1.2, overflow: "linebreak", halign: "center" },
    headStyles: { fillColor: [242, 244, 247], textColor: [50, 50, 50], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const actividad = params.actividades[data.row.index];
      if (data.column.index === riesgoInherenteIdx && actividad.nivel_riesgo) {
        const n = normalizarNivel(actividad.nivel_riesgo);
        const hex = n ? NIVEL_HEX[n] : null;
        if (hex) {
          data.cell.styles.fillColor = hexToRgb(hex);
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
      }
      if (data.column.index === riesgoResidualIdx && actividad.nivel_riesgo_residual) {
        const n = normalizarNivel(actividad.nivel_riesgo_residual);
        const hex = n ? NIVEL_HEX[n] : null;
        if (hex) {
          data.cell.styles.fillColor = hexToRgb(hex);
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(`matriz-riesgos-${params.nombreEmpresa}-v${params.version}.pdf`);
}
