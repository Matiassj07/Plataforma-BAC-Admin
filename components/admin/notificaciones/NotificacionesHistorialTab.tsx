"use client";

import { formatearFecha } from "@/lib/utils";
import { TIPOS_ALERTA, type HistorialNotificacion } from "@/lib/admin/notificaciones-types";

const ESTADO_COLORS: Record<string, { badge: string; label: string }> = {
  enviado: { badge: "bg-bac-score-verde/10 text-bac-score-verde", label: "Enviado" },
  pendiente: { badge: "bg-yellow-100 text-yellow-700", label: "Pendiente" },
  error: { badge: "bg-red-100 text-bac-score-rojo", label: "Error" },
};

function etiquetaAlerta(tipo: string): string {
  return TIPOS_ALERTA.find((t) => t.key === tipo)?.label ?? tipo;
}

export function NotificacionesHistorialTab({ historial }: { historial: HistorialNotificacion[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-bac-gray-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bac-gray-border bg-bac-gray-alt">
            <th className="px-4 py-3 text-left font-semibold text-bac-gray-text">Alerta</th>
            <th className="px-4 py-3 text-left font-semibold text-bac-gray-text">Estado</th>
            <th className="px-4 py-3 text-left font-semibold text-bac-gray-text">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bac-gray-border">
          {historial.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-bac-gray-text">
                Sin notificaciones registradas aún.
              </td>
            </tr>
          ) : (
            historial.map((h) => {
              const color = ESTADO_COLORS[h.estado] || ESTADO_COLORS.pendiente;
              return (
                <tr key={h.id} className="hover:bg-bac-gray-alt/40">
                  <td className="px-4 py-3 font-medium text-gray-900">{etiquetaAlerta(h.tipo_alerta)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${color.badge}`}>
                      {color.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-bac-gray-text">{formatearFecha(h.created_at)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
