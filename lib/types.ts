export type RolEnum = "cliente" | "admin" | "contador" | "asistente" | "revendedor";
export type TipoUsuarioEnum = "interno_bac" | "cliente_externo" | "revendedor";

export const ROL_LABELS: Record<RolEnum, string> = {
  admin: "Administrador",
  contador: "Contador",
  asistente: "Asistente",
  cliente: "Cliente",
  revendedor: "Revendedor",
};

export const ROLES_STAFF: RolEnum[] = ["admin", "contador", "asistente"];
export type TamanoEmpresaEnum = "1_10" | "11_50" | "51_200" | "201_500" | "500_plus";
export type TieneDpdEnum = "si_interno" | "si_externo" | "no" | "no_sabe";
export type IdiomaEnum = "es" | "en";
export type NichoEnum =
  | "grupos"
  | "broker"
  | "escuelas_conduccion"
  | "telecomunicaciones"
  | "escuelas"
  | "laboratorios"
  | "clinicas"
  | "industriales"
  | "restaurantes"
  | "firma_legal"
  | "hoteles"
  | "cooperativa"
  | "otros";
export type EtapaFlujoEnum =
  | "sin_iniciar"
  | "onboarding"
  | "rat_completado"
  | "riesgos_completados"
  | "docs_completos"
  | "plan_implementacion"
  | "dpd_completado"
  | "auditado";
export type DpdTipoEnum = "interno" | "externo";
export type SeveridadEnum = "critica" | "media" | "baja";
export type SemaforoEnum = "rojo" | "amarillo" | "verde";
export type EstadoDocEnum = "pendiente" | "procesando" | "analizado" | "error";
export type NivelAccesoEnum = "solo_lectura" | "lectura_carga";

export const NIVEL_ACCESO_LABELS: Record<NivelAccesoEnum, string> = {
  solo_lectura: "Solo lectura",
  lectura_carga: "Lectura y carga de documentos",
};
export type ProveedorAlmacenamientoEnum = "sharepoint" | "onedrive";
export type ProveedorCorreoEnum = "outlook" | "smtp_personalizado";

export interface Profile {
  id: string;
  email: string;
  nombre_empresa: string;
  nicho: NichoEnum;
  rol: RolEnum;
  created_at: string;
  sector: string | null;
  tamano_empresa: TamanoEmpresaEnum | null;
  trata_datos_especiales: string[] | null;
  tiene_dpd: TieneDpdEnum | null;
  tipo_usuario: TipoUsuarioEnum;
  es_pro: boolean;
  pro_aprobado_por_admin: boolean;
  pro_activado_en: string | null;
  onboarding_completado: boolean;
  onboarding_paso: number;
  idioma: IdiomaEnum;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  notificaciones: Record<string, boolean> | null;
  suspendido: boolean;
  ultima_actividad: string | null;
  nivel_acceso: NivelAccesoEnum | null;
  dpd_tipo: DpdTipoEnum | null;
  dpd_activo: boolean;
}

export const SECTOR_LABELS: Record<NichoEnum, string> = {
  grupos: "Grupos empresariales",
  broker: "Seguros / Broker",
  escuelas_conduccion: "Escuelas de conducción",
  telecomunicaciones: "Telecomunicaciones",
  escuelas: "Educación",
  laboratorios: "Laboratorios",
  clinicas: "Salud",
  industriales: "Industrial",
  restaurantes: "Restaurantes",
  firma_legal: "Firma legal",
  hoteles: "Hoteles",
  cooperativa: "Cooperativa de ahorro y crédito",
  otros: "Otros - especificar"
};

export const TIPO_USUARIO_LABELS: Record<TipoUsuarioEnum, string> = {
  interno_bac: "Interno BAC",
  cliente_externo: "Cliente externo",
  revendedor: "Revendedor",
};

export const DPD_TIPO_LABELS: Record<DpdTipoEnum, string> = {
  interno: "Interno (DPD activo)",
  externo: "Externo (DPD no activo)",
};

export const ETAPA_FLUJO_LABELS: Record<EtapaFlujoEnum, string> = {
  sin_iniciar: "Sin iniciar",
  onboarding: "Onboarding",
  rat_completado: "RAT completado",
  riesgos_completados: "Riesgos completados",
  docs_completos: "Docs completos",
  plan_implementacion: "Plan de implementación",
  dpd_completado: "DPD",
  auditado: "Auditado",
};
