import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, proveedorConfigurado, type OAuthProvider } from "@/lib/admin/almacenamiento-oauth";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  if (profile?.rol !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const proveedor = searchParams.get("proveedor") as OAuthProvider | null;
  const carpeta = searchParams.get("carpeta") ?? "";

  if (!proveedor || !["onedrive", "sharepoint"].includes(proveedor)) {
    return NextResponse.json({ error: "Proveedor inválido" }, { status: 400 });
  }

  if (!proveedorConfigurado(proveedor)) {
    return NextResponse.json(
      { error: "Las credenciales de Microsoft no están configuradas." },
      { status: 400 },
    );
  }

  const nonce = crypto.randomUUID();
  const state = `${nonce}::${proveedor}::${carpeta}`;
  const cookieStore = (await import("next/headers")).cookies();
  cookieStore.set("oauth_state", nonce, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  const authUrl = buildAuthUrl(proveedor, state);

  return NextResponse.redirect(authUrl);
}
