export interface DpdPlan {
  id: string;
  profile_id: string;
  creado_por: string | null;
  periodo_inicio: string;
  periodo_fin: string;
  nombre_dpd: string;
  correo_dpd: string;
  url_plan_adjunto: string | null;
  created_at: string;
}

export interface DpdActividad {
  id: string;
  plan_id: string;
  mes: number;
  fase: string;
  descripcion: string;
  verificacion: string | null;
  completada: boolean;
  fecha_completado: string | null;
  observaciones: string | null;
  url_informe: string | null;
  created_at: string;
}

export type DpdActaEstado = "pendiente_firma" | "firmada" | "archivada";

export interface DpdActa {
  id: string;
  plan_id: string;
  actividad_id: string | null;
  numero_acta: string;
  descripcion_hallazgo: string;
  recomendacion: string;
  estado: DpdActaEstado;
  url_acta_generada: string | null;
  url_acta_firmada: string | null;
  created_at: string;
}

export interface DpdInformeBrecha {
  id: string;
  plan_id: string;
  mes: string;
  anio: number;
  hubo_brecha: boolean;
  contenido: string;
  url_informe: string | null;
  created_at: string;
}

export interface DpdData {
  plan: DpdPlan | null;
  actividades: DpdActividad[];
  actas: DpdActa[];
  informesBrechas: DpdInformeBrecha[];
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
