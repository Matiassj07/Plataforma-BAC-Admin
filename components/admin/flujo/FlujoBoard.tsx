"use client";

import { useState } from "react";
import { ClienteCard } from "./ClienteCard";
import { ETAPAS_KANBAN, SCORE_POR_ETAPA, type TarjetaFlujo } from "@/lib/flujo-format";
import { moverEtapaCliente } from "@/lib/admin/flujo-actions";
import type { EtapaFlujoEnum } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FlujoBoard({ tarjetas: tarjetasIniciales }: { tarjetas: TarjetaFlujo[] }) {
  const [tarjetas, setTarjetas] = useState(tarjetasIniciales);
  const [columnaActiva, setColumnaActiva] = useState<EtapaFlujoEnum | null>(null);

  function moverCliente(clienteId: string, nuevaEtapa: EtapaFlujoEnum) {
    setTarjetas((arr) =>
      arr.map((t) =>
        t.id === clienteId ? { ...t, etapa: nuevaEtapa, score: SCORE_POR_ETAPA[nuevaEtapa] } : t
      )
    );
    moverEtapaCliente(clienteId, nuevaEtapa).catch(() => {
      setTarjetas(tarjetasIniciales);
    });
  }

  function handleDrop(e: React.DragEvent, etapa: EtapaFlujoEnum) {
    e.preventDefault();
    setColumnaActiva(null);
    const clienteId = e.dataTransfer.getData("text/plain");
    if (clienteId) moverCliente(clienteId, etapa);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {ETAPAS_KANBAN.map((etapa, idx) => {
        const items = tarjetas.filter((t) => t.etapa === etapa.key);
        const siguiente = ETAPAS_KANBAN[idx + 1] ?? null;
        return (
          <div
            key={etapa.key}
            onDragOver={(e) => {
              e.preventDefault();
              setColumnaActiva(etapa.key);
            }}
            onDragLeave={() => setColumnaActiva((c) => (c === etapa.key ? null : c))}
            onDrop={(e) => handleDrop(e, etapa.key)}
            className={cn(
              "flex min-h-[200px] flex-col gap-2 rounded-xl border border-bac-gray-border bg-bac-gray-alt p-3 transition-colors",
              columnaActiva === etapa.key && "border-bac-red bg-red-50/40"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{etapa.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-bac-gray-text">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {items.map((t) => (
                <ClienteCard
                  key={t.id}
                  tarjeta={t}
                  siguienteEtapa={siguiente}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onMoverSiguiente={() => siguiente && moverCliente(t.id, siguiente.key)}
                />
              ))}
              {items.length === 0 && (
                <p className="py-6 text-center text-xs text-bac-gray-text">Sin clientes</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
