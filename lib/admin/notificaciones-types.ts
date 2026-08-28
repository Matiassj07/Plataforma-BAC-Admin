export interface ConfigNotificaciones {
  id: number;
  nuevo_cliente_registrado: boolean;
  analisis_completado: boolean;
  brecha_critica: boolean;
  doc_sin_actualizar: boolean;
  brecha_seguridad_registrada: boolean;
  score_bajo: boolean;
  cliente_inactivo: boolean;
  contrato_por_vencer: boolean;
  updated_at: string;
}

export interface HistorialNotificacion {
  id: string;
  destinatario_id: string | null;
  tipo_alerta: string;
  estado: string;
  created_at: string;
}

export const TIPOS_ALERTA: {
  key: keyof Omit<ConfigNotificaciones, "id" | "updated_at">;
  label: string;
  descripcion: string;
}[] = [
  {
    key: "nuevo_cliente_registrado",
    label: "Nuevo cliente registrado",
    descripcion: "Se notifica cuando se crea un nuevo cliente en la plataforma.",
  },
  {
    key: "analisis_completado",
    label: "Análisis completado",
    descripcion: "Se notifica cuando finaliza el análisis de cumplimiento de un cliente.",
  },
  {
    key: "brecha_critica",
    label: "Brecha crítica detectada",
    descripcion: "Se notifica cuando se identifica una brecha de cumplimiento crítica.",
  },
  {
    key: "doc_sin_actualizar",
    label: "Documento sin actualizar",
    descripcion: "Se notifica cuando un documento requerido lleva tiempo sin actualizarse.",
  },
  {
    key: "brecha_seguridad_registrada",
    label: "Brecha de seguridad registrada",
    descripcion: "Se notifica cuando se registra un incidente de seguridad para un cliente.",
  },
  {
    key: "score_bajo",
    label: "Score bajo",
    descripcion: "Se notifica cuando el score de cumplimiento de un cliente cae por debajo del umbral.",
  },
  {
    key: "cliente_inactivo",
    label: "Cliente inactivo",
    descripcion: "Se notifica cuando un cliente no registra actividad reciente.",
  },
  {
    key: "contrato_por_vencer",
    label: "Contrato por vencer",
    descripcion: "Se notifica cuando el contrato de un cliente está próximo a vencer.",
  },
];
