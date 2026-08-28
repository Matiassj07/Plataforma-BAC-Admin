import type { ClienteListItem } from "@/lib/admin/clientes";

const BAC_RED = "D2122E";
const VERDE = "16A34A";
const ROJO = "DC2626";
const BORDE = { style: "thin" as const, color: { argb: "FFE4E7EC" } };
const BORDES_CELDA = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };

export async function exportarClientesXlsx(clientes: ClienteListItem[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clientes");

  ws.mergeCells(1, 1, 1, 5);
  const titulo = ws.getCell(1, 1);
  titulo.value = "TABLA DE CLIENTES — BAC LEGAL ADVISOR";
  titulo.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BAC_RED}` } };
  titulo.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;

  const headers = ["Empresa", "RUC", "Sector", "Score", "DPD"];
  const headerRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BAC_RED}` } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = BORDES_CELDA;
  });
  headerRow.height = 24;

  clientes.forEach((c, idx) => {
    const row = ws.getRow(4 + idx);
    row.getCell(1).value = c.nombre_empresa;
    row.getCell(2).value = c.ruc || "—";
    row.getCell(3).value = c.sector || "—";
    row.getCell(4).value = c.score != null ? `${c.score}%` : "—";

    const dpdCell = row.getCell(5);
    dpdCell.value = c.dpd_activo ? "Activo" : "No activo";
    dpdCell.font = {
      bold: true,
      color: { argb: c.dpd_activo ? `FF${VERDE}` : `FF${ROJO}` },
      size: 10,
    };
    dpdCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.dpd_activo ? "FFF0FDF4" : "FFFEF2F2" },
    };

    for (let ci = 1; ci <= 5; ci++) {
      const cell = row.getCell(ci);
      cell.border = BORDES_CELDA;
      cell.alignment = { vertical: "middle" };
      if (ci !== 5) cell.font = { size: 10 };
      if (idx % 2 === 1 && ci !== 5) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F9FC" } };
      }
    }
  });

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 25;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 14;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clientes-bac.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
