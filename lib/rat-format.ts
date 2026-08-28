import type { ActividadRat } from "@/lib/admin/expediente";

export const COLUMNAS_RAT: { key: keyof ActividadRat; label: string }[] = [
  { key: "departamento", label: "Departamento" },
  { key: "nombre_actividad", label: "Actividad de Tratamiento" },
  { key: "finalidad", label: "Finalidad" },
  { key: "categoria_datos", label: "Categoría de Datos" },
  { key: "categorias_especiales", label: "Categorías Especiales de Datos" },
  { key: "perfiles_automatizados", label: "Elaboración de Perfiles Automatizados" },
  { key: "categorias_titulares", label: "Categorías de Titulares" },
  { key: "origen_datos", label: "Origen de los Datos" },
  { key: "base_licitud", label: "Base de Licitud" },
  { key: "articulo_lopdp", label: "Artículo LOPDP" },
  { key: "almacenamiento", label: "Almacenamiento" },
  { key: "plazo_conservacion", label: "Plazo de Conservación" },
  { key: "destinatarios", label: "Destinatarios" },
  { key: "transferencias_internacionales", label: "Transferencias Internacionales de Datos" },
  { key: "medidas_seguridad", label: "Medidas Técnicas y Organizativas de Seguridad" },
  { key: "activo_informacion", label: "Activo de Información" },
];

export function celdaRat(valor: unknown): string {
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (Array.isArray(valor)) return valor.length > 0 ? valor.join(", ") : "—";
  return (valor as string | null) || "—";
}
