import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

async function handleLogout(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(new URL("/login", origin), { status: 302 });
  response.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name);
    }
  });

  return response;
}
