import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode } from "@/lib/admin/almacenamiento-oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/admin/almacenamiento?error=oauth_denied", request.url));
  }

  const parts = state.split("::");
  const nonce = parts[0];
  const proveedor = parts[1] as "onedrive" | "sharepoint";
  const carpeta = parts[2] ?? "";

  const cookieStore = (await import("next/headers")).cookies();
  const savedNonce = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");
  if (!savedNonce || savedNonce !== nonce) {
    return NextResponse.redirect(new URL("/admin/almacenamiento?error=csrf_invalid", request.url));
  }

  try {
    const tokens = await exchangeCode(proveedor, code);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const { data: existing } = await supabase
      .from("integraciones_almacenamiento")
      .select("id")
      .eq("admin_id", user.id)
      .eq("proveedor", proveedor)
      .single();

    if (existing) {
      await supabase.from("integraciones_almacenamiento").update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expira: new Date(tokens.expires_at * 1000).toISOString(),
        activo: true,
      }).eq("id", existing.id);
    } else {
      await supabase.from("integraciones_almacenamiento").insert({
        admin_id: user.id,
        proveedor,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expira: new Date(tokens.expires_at * 1000).toISOString(),
        activo: true,
        carpeta_destino: carpeta || null,
      });
    }

    return NextResponse.redirect(new URL(`/admin/almacenamiento?connected=${proveedor}`, request.url));
  } catch {
    return NextResponse.redirect(new URL("/admin/almacenamiento?error=oauth_failed", request.url));
  }
}
