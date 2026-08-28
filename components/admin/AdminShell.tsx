"use client";

import { useState } from "react";
import { AdminNavbar } from "./AdminNavbar";
import { AdminSidebar } from "./AdminSidebar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function AdminShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-bac-gray-alt">
      <AdminNavbar profile={profile} />
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} rol={profile.rol} />
      <main
        className={cn(
          "min-h-screen pt-16 transition-all",
          collapsed ? "pl-16" : "pl-60"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
      <div className={cn("pb-4 text-right pr-6 transition-all", collapsed ? "pl-16" : "pl-60")}>
        <span className="text-[11px] text-gray-400/70 select-none tracking-wide">
          Developed by © Kappa-ai.com
        </span>
      </div>
    </div>
  );
}
