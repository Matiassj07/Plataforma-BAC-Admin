import { formatearFecha } from "@/lib/utils";
import type { HistorialItem } from "@/lib/admin/expediente";

export function HistorialTab({ historial }: { historial: HistorialItem[] }) {
  if (historial.length === 0) {
    return <p className="text-sm text-bac-gray-text">Sin actividad registrada todavía.</p>;
  }

  return (
    <div className="rounded-xl border border-bac-gray-border bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-bac-gray-border bg-bac-gray-alt text-xs font-medium uppercase tracking-wide text-bac-gray-text">
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Acción</th>
            <th className="px-4 py-3">Módulo</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((h) => (
            <tr key={h.id} className="border-b border-bac-gray-border last:border-0">
              <td className="px-4 py-3 text-bac-gray-text">{formatearFecha(h.created_at)}</td>
              <td className="px-4 py-3 text-gray-800">{h.accion}</td>
              <td className="px-4 py-3 text-bac-gray-text">{h.modulo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
