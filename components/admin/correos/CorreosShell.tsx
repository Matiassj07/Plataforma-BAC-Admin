"use client";

import { useState } from "react";
import { Mail, FileText, Send, History } from "lucide-react";
import type { ConfigCorreo, PlantillaCorreo, HistorialCorreo, ClienteCorreo } from "@/lib/admin/correos";
import { CorreosConfigTab } from "./CorreosConfigTab";
import { CorreosPlantillasTab } from "./CorreosPlantillasTab";
import { CorreosEnvioTab } from "./CorreosEnvioTab";
import { CorreosHistorialTab } from "./CorreosHistorialTab";

export function CorreosShell({
  config,
  plantillas: plantillasInit,
  historial,
  clientes,
}: {
  config: ConfigCorreo | null;
  plantillas: PlantillaCorreo[];
  historial: HistorialCorreo[];
  clientes: ClienteCorreo[];
}) {
  const [activeTab, setActiveTab] = useState<"config" | "plantillas" | "envio" | "historial">(
    "config"
  );
  const [plantillas, setPlantillas] = useState(plantillasInit);

  const tabs = [
    { id: "config" as const, label: "Configuración", icon: Mail },
    { id: "plantillas" as const, label: "Plantillas", icon: FileText },
    { id: "envio" as const, label: "Envío manual", icon: Send },
    { id: "historial" as const, label: "Historial", icon: History },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-bac-gray-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? "border-bac-red text-gray-900"
                  : "border-transparent text-bac-gray-text hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "config" && <CorreosConfigTab config={config} />}
        {activeTab === "plantillas" && (
          <CorreosPlantillasTab plantillas={plantillas} onPlantillasUpdated={setPlantillas} />
        )}
        {activeTab === "envio" && <CorreosEnvioTab plantillas={plantillas} clientes={clientes} />}
        {activeTab === "historial" && <CorreosHistorialTab historial={historial} />}
      </div>
    </div>
  );
}
