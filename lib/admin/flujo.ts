import { createAdminClient } from "@/lib/supabase/admin";
import type { EtapaFlujoEnum } from "@/lib/types";
import { SCORE_POR_ETAPA, type TarjetaFlujo } from "@/lib/flujo-format";

export interface FlujoFiltros {
  sector?: string;
  tipoUsuario?: string;
}

/** "onboarding" no tiene columna propia en el kanban; se agrupa con "sin_iniciar". */
function etapaVisible(etapa: EtapaFlujoEnum | null): EtapaFlujoEnum {
  if (!etapa || etapa === "onboarding") return "sin_iniciar";
  return etapa;
}

export async function getFlujoData(filtros: FlujoFiltros): Promise<TarjetaFlujo[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("id, nombre_empresa, sector, tipo_usuario, ultima_actividad")
    .eq("rol", "cliente");
  if (filtros.sector) query = query.eq("sector", filtros.sector);
  if (filtros.tipoUsuario) query = query.eq("tipo_usuario", filtros.tipoUsuario);
  const { data: profiles } = await query;

  const clientes = profiles ?? [];
  const ids = clientes.map((c) => c.id);
  if (ids.length === 0) return [];

  const { data: flujos } = await supabase
    .from("flujo_estados")
    .select("profile_id, etapa")
    .in("profile_id", ids);

  const etapaPorCliente = new Map((flujos ?? []).map((f) => [f.profile_id, f.etapa as EtapaFlujoEnum]));

  return clientes.map((c) => {
    const etapa = etapaVisible(etapaPorCliente.get(c.id) ?? null);
    return {
      id: c.id,
      nombre_empresa: c.nombre_empresa,
      sector: c.sector,
      tipo_usuario: c.tipo_usuario,
      ultima_actividad: c.ultima_actividad,
      score: SCORE_POR_ETAPA[etapa],
      etapa,
    };
  });
}
