import type { EtapaFlujoEnum, TipoUsuarioEnum } from "@/lib/types";

export const ETAPAS_KANBAN: { key: EtapaFlujoEnum; label: string }[] = [
  { key: "sin_iniciar", label: "Sin iniciar" },
  { key: "docs_completos", label: "Docs completos" },
  { key: "rat_completado", label: "RAT completado" },
  { key: "riesgos_completados", label: "Riesgos completados" },
  { key: "plan_implementacion", label: "Plan implementación" },
  { key: "dpd_completado", label: "DPD" },
  { key: "auditado", label: "Auditado" },
];

export const SCORE_POR_ETAPA: Record<EtapaFlujoEnum, number> = {
  sin_iniciar: 0,
  onboarding: 0,
  docs_completos: 30,
  rat_completado: 60,
  riesgos_completados: 90,
  plan_implementacion: 95,
  dpd_completado: 99,
  auditado: 100,
};

export interface TarjetaFlujo {
  id: string;
  nombre_empresa: string;
  sector: string | null;
  tipo_usuario: TipoUsuarioEnum;
  ultima_actividad: string | null;
  score: number | null;
  etapa: EtapaFlujoEnum;
}
