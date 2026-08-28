import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("plantillas_correo")
      .select("id,tipo,asunto,cuerpo,updated_at")
      .order("tipo", { ascending: true });

    if (error) throw new Error(error.message);

    return Response.json(
      { success: true, plantillas: data || [] },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
