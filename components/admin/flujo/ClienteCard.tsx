"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { formatearFecha } from "@/lib/utils";
import type { TarjetaFlujo } from "@/lib/flujo-format";

export function ClienteCard({
  tarjeta,
  siguienteEtapa,
  onDragStart,
  onMoverSiguiente,
}: {
  tarjeta: TarjetaFlujo;
  siguienteEtapa: { key: string; label: string } | null;
  onDragStart: (e: React.DragEvent) => void;
  onMoverSiguiente: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab space-y-2 rounded-lg border border-bac-gray-border bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/admin/clientes/${tarjeta.id}`}
          className="text-sm font-medium text-gray-900 hover:text-bac-red hover:underline"
        >
          {tarjeta.nombre_empresa}
        </Link>
        <ScoreBadge score={tarjeta.score} />
      </div>
      <p className="text-xs text-bac-gray-text">{tarjeta.sector ?? "Sin sector"}</p>
      <p className="text-xs text-bac-gray-text">
        Última actividad: {formatearFecha(tarjeta.ultima_actividad)}
      </p>
      {siguienteEtapa && (
        <button
          onClick={onMoverSiguiente}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-bac-gray-border py-1 text-xs font-medium text-bac-gray-text hover:bg-bac-gray-alt"
        >
          Mover a {siguienteEtapa.label} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
