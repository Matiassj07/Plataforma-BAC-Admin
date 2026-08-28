"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import type { EtapaFlujoEnum } from "@/lib/types";
import { ETAPAS_KANBAN, SCORE_POR_ETAPA } from "@/lib/flujo-format";

const ORDEN_ETAPAS = ETAPAS_KANBAN.map((e) => e.key);

function indiceEtapa(etapa: EtapaFlujoEnum | null): number {
  if (!etapa || etapa === "onboarding") return 0;
  const idx = ORDEN_ETAPAS.indexOf(etapa);
  return idx >= 0 ? idx : 0;
}

async function actualizarEtapaYScore(
  supabase: ReturnType<typeof createAdminClient>,
  clienteId: string,
  etapa: EtapaFlujoEnum,
  motivo: string
) {
  await supabase
    .from("flujo_estados")
    .upsert({ profile_id: clienteId, etapa, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });

  const nuevoScore = SCORE_POR_ETAPA[etapa];
  const mes = new Date().toISOString().slice(0, 7);
  await supabase
    .from("score_historial")
    .upsert(
      { profile_id: clienteId, score: nuevoScore, mes },
      { onConflict: "profile_id,mes" }
    );

  await supabase.from("historial_acciones").insert({
    profile_id: clienteId,
    accion: `${motivo} — score actualizado a ${nuevoScore}%`,
    modulo: "Flujo",
  });
}

export async function moverEtapaCliente(clienteId: string, etapa: EtapaFlujoEnum) {
  await requireStaff();
  const supabase = createAdminClient();
  await actualizarEtapaYScore(supabase, clienteId, etapa, `Movido manualmente a "${etapa}" en el flujo (por administrador)`);
  revalidatePath("/admin/flujo");
}

export async function avanzarFlujoAutomatico(
  clienteId: string,
  etapaDestino: EtapaFlujoEnum,
  motivo: string
) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("flujo_estados")
    .select("etapa")
    .eq("profile_id", clienteId)
    .maybeSingle();

  const etapaActual = (data?.etapa as EtapaFlujoEnum) ?? null;
  const idxActual = indiceEtapa(etapaActual);
  const idxDestino = indiceEtapa(etapaDestino);

  if (idxDestino > idxActual) {
    await actualizarEtapaYScore(supabase, clienteId, etapaDestino, motivo);
  }
}
