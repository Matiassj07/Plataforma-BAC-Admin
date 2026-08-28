import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("integraciones_almacenamiento")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, integraciones: data ?? [] }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
