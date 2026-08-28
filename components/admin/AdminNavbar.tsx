"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Search, Settings, User as UserIcon } from "lucide-react";
import { Dropdown } from "./Dropdown";
import { createClient } from "@/lib/supabase/client";
import { iniciales } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function AdminNavbar({ profile }: { profile: Profile }) {
  const router = useRouter();
  const initialUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      initialUserId.current = data.user?.id ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (initialUserId.current && session?.user?.id && session.user.id !== initialUserId.current) {
        window.location.reload();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    sessionStorage.removeItem("bac-admin-session-uid");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    router.push(`/admin/clientes${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-bac-gray-border bg-white px-4">
      <Link href="/admin" className="flex min-w-0 items-center gap-2">
        <Image src="/logo-bac.jpg" alt="BAC Legal Advisor" width={140} height={38} className="h-8 w-auto object-contain" priority />
        <span className="rounded bg-bac-gray-alt px-2 py-0.5 text-xs font-medium text-bac-gray-text">
          Admin
        </span>
      </Link>

      <form onSubmit={handleSearch} className="mx-4 hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bac-gray-text" />
          <input
            name="q"
            type="text"
            placeholder="Buscar cliente por nombre o correo..."
            className="w-full rounded-lg border border-bac-gray-border bg-bac-gray-alt py-2 pl-9 pr-3 text-sm outline-none focus:border-bac-red focus:bg-white focus:ring-1 focus:ring-bac-red"
          />
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-2">
        <Dropdown
          trigger={(open) => (
            <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bac-gray-alt">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bac-red text-xs font-semibold text-white">
                {iniciales(profile.nombre_empresa || profile.email)}
              </span>
              <span className="hidden max-w-[120px] truncate text-gray-800 sm:block">
                {profile.nombre_empresa}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
            </span>
          )}
        >
          {(close) => (
            <div className="py-1 text-sm">
              <Link
                href="/admin/perfil"
                onClick={close}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-bac-gray-alt"
              >
                <UserIcon className="h-4 w-4" /> Mi perfil
              </Link>
              <Link
                href="/admin/configuracion"
                onClick={close}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-bac-gray-alt"
              >
                <Settings className="h-4 w-4" /> Configuración
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-bac-score-rojo hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
