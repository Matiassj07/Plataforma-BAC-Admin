"use client";

import { useState } from "react";
import { Building2, Users, Zap } from "lucide-react";
import type { BacConfig, AdminItem } from "@/lib/admin/configuracion-types";
import { DatosBacTab } from "./DatosBacTab";
import { AdministradoresTab } from "./AdministradoresTab";
import { ControlProTab } from "./ControlProTab";

export function ConfiguracionShell({
  config,
  administradores,
  actorId,
}: {
  config: BacConfig | null;
  administradores: AdminItem[];
  actorId: string;
}) {
  const [tab, setTab] = useState<"datos" | "admins" | "pro">("datos");

  const tabs = [
    { id: "datos" as const, label: "Datos de BAC", icon: Building2 },
    { id: "admins" as const, label: "Administradores", icon: Users },
    { id: "pro" as const, label: "Control PRO", icon: Zap },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-bac-gray-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? "border-bac-red text-gray-900"
                  : "border-transparent text-bac-gray-text hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "datos" && <DatosBacTab config={config} />}
      {tab === "admins" && <AdministradoresTab administradores={administradores} actorId={actorId} />}
      {tab === "pro" && <ControlProTab config={config} />}
    </div>
  );
}
