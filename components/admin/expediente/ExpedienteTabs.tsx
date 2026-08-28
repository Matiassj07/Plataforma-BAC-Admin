"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RatTab } from "./tabs/RatTab";
import { RiesgosTab } from "./tabs/RiesgosTab";
import { DocumentosTab } from "./tabs/DocumentosTab";
import { PersonalTab } from "./tabs/PersonalTab";
import { PlanImplementacionTab } from "./tabs/PlanImplementacionTab";
import { DpdTab } from "./tabs/DpdTab";
import { NotasTab } from "./tabs/NotasTab";
import { HistorialTab } from "./tabs/HistorialTab";
import type { ExpedienteData } from "@/lib/admin/expediente";

const TABS = [
  { key: "documentos", label: "Documentos" },
  { key: "rat", label: "RAT" },
  { key: "riesgos", label: "Riesgos" },
  { key: "plan", label: "Plan de impl." },
  { key: "dpd", label: "DPD" },
  { key: "personal", label: "Personal" },
  { key: "notas", label: "Notas" },
  { key: "historial", label: "Historial" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ExpedienteTabs({ data }: { data: ExpedienteData }) {
  const [tab, setTab] = useState<TabKey>("documentos");
  const [focusPlanId, setFocusPlanId] = useState<string | null>(null);

  const onNavigateToTab = useCallback((targetTab: string, planId?: string) => {
    setTab(targetTab as TabKey);
    if (planId) setFocusPlanId(planId);
  }, []);

  const ratActividades = (() => {
    const seen = new Set<string>();
    const result: { id: string; index: number; nombre: string }[] = [];
    for (const v of data.ratVersiones) {
      for (let i = 0; i < v.actividades.length; i++) {
        const a = v.actividades[i];
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        result.push({ id: a.id, index: result.length + 1, nombre: a.nombre_actividad ?? `Actividad ${i + 1}` });
      }
    }
    return result;
  })();

  const riesgoActividades = (data.matrices[0]?.actividades ?? []).map((a, i) => ({
    id: a.id, index: i + 1, nombre: a.actividad_tratamiento ?? `Riesgo ${i + 1}`,
  }));

  return (
    <div className="rounded-xl border border-bac-gray-border bg-white p-4">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-bac-gray-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === t.key
                ? "bg-bac-red text-white"
                : "text-bac-gray-text hover:bg-bac-gray-alt hover:text-gray-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rat" && (
        <RatTab
          clienteId={data.cliente.id}
          nombreEmpresa={data.cliente.nombre_empresa}
          email={data.cliente.email}
          versiones={data.ratVersiones}
          carpetasEjemplo={data.carpetasEjemplo}
          carpetas={data.carpetas}
          cambiosCampoRat={data.cambiosCampoRat}
          planes={data.planesImplementacion.filter((p) => p.tipo === "rat")}
          onNavigateToTab={onNavigateToTab}
        />
      )}
      {tab === "riesgos" && (
        <RiesgosTab
          clienteId={data.cliente.id}
          matrices={data.matrices}
          nombreEmpresa={data.cliente.nombre_empresa}
          ratActividades={data.ratVersiones[0]?.actividades ?? []}
          cambiosCampoRiesgo={data.cambiosCampoRiesgo}
          planes={data.planesImplementacion.filter((p) => p.tipo === "riesgos")}
          onNavigateToTab={onNavigateToTab}
        />
      )}
      {tab === "documentos" && (
        <DocumentosTab
          clienteId={data.cliente.id}
          documentos={data.documentos}
          carpetas={data.carpetas}
          carpetasEjemplo={data.carpetasEjemplo}
          actividadesRat={ratActividades}
          planes={data.planesImplementacion.filter((p) => p.tipo === "documentos")}
          acta={data.actaEntrega}
          onNavigateToTab={onNavigateToTab}
        />
      )}
      {tab === "personal" && <PersonalTab clienteId={data.cliente.id} personal={data.personal} />}
      {tab === "plan" && (
        <PlanImplementacionTab
          clienteId={data.cliente.id}
          planes={data.planesImplementacion}
          actividadesRat={ratActividades}
          actividadesRiesgo={riesgoActividades}
          documentos={data.carpetas.flatMap((c) => c.documentos.map((d) => ({ id: d.id, nombre: `${c.nombre}/${d.nombre_archivo}` })))}
          focusPlanId={focusPlanId}
        />
      )}
      {tab === "dpd" && <DpdTab clienteId={data.cliente.id} dpd={data.dpd} brechasSeguridad={data.brechasSeguridad} />}
      {tab === "notas" && <NotasTab clienteId={data.cliente.id} notas={data.notas} />}
      {tab === "historial" && <HistorialTab historial={data.historial} />}
    </div>
  );
}
