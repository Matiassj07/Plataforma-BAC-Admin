/**
 * Utilidades compartidas para leer archivos de texto plano con formato
 * "Etiqueta: valor".
 */

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g"), "")
    .toLowerCase()
    .trim();
}

export function normalizarSiNo(valor: string): "" | "si" | "no" {
  const v = normalizarTexto(valor);
  if (v.startsWith("s")) return "si";
  if (v.startsWith("n")) return "no";
  return "";
}

export function extraerNumero1a5(valor: string): string {
  const m = valor.match(/[1-5]/);
  return m ? m[0] : "";
}

export function parsearCSVGenerico(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;
  let i = 0;

  while (i < texto.length) {
    const ch = texto[i];
    if (enComillas) {
      if (ch === '"') {
        if (i + 1 < texto.length && texto[i + 1] === '"') {
          campo += '"';
          i += 2;
        } else {
          enComillas = false;
          i++;
        }
      } else {
        campo += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        enComillas = true;
        i++;
      } else if (ch === ",") {
        fila.push(campo.trim());
        campo = "";
        i++;
      } else if (ch === "\r" || ch === "\n") {
        fila.push(campo.trim());
        campo = "";
        if (ch === "\r" && i + 1 < texto.length && texto[i + 1] === "\n") i++;
        i++;
        if (fila.some((c) => c !== "")) filas.push(fila);
        fila = [];
      } else {
        campo += ch;
        i++;
      }
    }
  }
  fila.push(campo.trim());
  if (fila.some((c) => c !== "")) filas.push(fila);
  return filas;
}
