"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function guardarConfigNotificaciones(config: {
  id: number;
  nuevo_cliente_registrado: boolean;
  analisis_completado: boolean;
  brecha_critica: boolean;
  doc_sin_actualizar: boolean;
  brecha_seguridad_registrada: boolean;
  score_bajo: boolean;
  cliente_inactivo: boolean;
  contrato_por_vencer: boolean;
}) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notificaciones_globales")
    .update({
      nuevo_cliente_registrado: config.nuevo_cliente_registrado,
      analisis_completado: config.analisis_completado,
      brecha_critica: config.brecha_critica,
      doc_sin_actualizar: config.doc_sin_actualizar,
      brecha_seguridad_registrada: config.brecha_seguridad_registrada,
      score_bajo: config.score_bajo,
      cliente_inactivo: config.cliente_inactivo,
      contrato_por_vencer: config.contrato_por_vencer,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/notificaciones");
}
