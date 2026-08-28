import { createAdminClient } from "@/lib/supabase/admin";
import type { DpdPlan, DpdActividad, DpdActa, DpdInformeBrecha, DpdData } from "./dpd-types";

export type { DpdPlan, DpdActividad, DpdActa, DpdActaEstado, DpdInformeBrecha, DpdData } from "./dpd-types";

export async function getDpdData(profileId: string): Promise<DpdData> {
  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from("dpd_planes")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return { plan: null, actividades: [], actas: [], informesBrechas: [] };

  const [{ data: actividades }, { data: actas }, { data: brechas }] = await Promise.all([
    supabase.from("dpd_actividades").select("*").eq("plan_id", plan.id).order("mes"),
    supabase.from("dpd_actas").select("*").eq("plan_id", plan.id).order("created_at", { ascending: false }),
    supabase.from("dpd_informes_brechas").select("*").eq("plan_id", plan.id).order("anio", { ascending: false }).order("mes", { ascending: false }),
  ]);

  return {
    plan: plan as DpdPlan,
    actividades: (actividades ?? []) as DpdActividad[],
    actas: (actas ?? []) as DpdActa[],
    informesBrechas: (brechas ?? []) as DpdInformeBrecha[],
  };
}
