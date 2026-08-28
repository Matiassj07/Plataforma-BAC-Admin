"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import type { RatVersion } from "@/lib/admin/expediente";

function compararCampos(a: Record<string, string> | null, b: Record<string, string> | null) {
  const claves = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  return Array.from(claves).map((clave) => ({
    clave,
    valorA: a?.[clave] ?? "—",
    valorB: b?.[clave] ?? "—",
    distinto: (a?.[clave] ?? "") !== (b?.[clave] ?? ""),
  }));
}

export function DiffRatModal({
  versiones,
  onClose,
}: {
  versiones: RatVersion[];
  onClose: () => void;
}) {
  const [idxA, setIdxA] = useState(Math.min(1, versiones.length - 1));
  const [idxB, setIdxB] = useState(0);
  const versionA = versiones[idxA];
  const versionB = versiones[idxB];

  const diffResponsable = compararCampos(versionA?.datos_responsable, versionB?.datos_responsable);
  const diffDpd = compararCampos(versionA?.datos_dpd, versionB?.datos_dpd);

  return (
    <Modal title="Ver diferencias entre versiones del RAT" onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Versión A</label>
            <select
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              value={idxA}
              onChange={(e) => setIdxA(Number(e.target.value))}
            >
              {versiones.map((v, i) => (
                <option key={v.id} value={i}>
                  v{v.version}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Versión B</label>
            <select
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm"
              value={idxB}
              onChange={(e) => setIdxB(Number(e.target.value))}
            >
              {versiones.map((v, i) => (
                <option key={v.id} value={i}>
                  v{v.version}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-bac-gray-text">
            Actividades: v{versionA?.version} tiene {versionA?.actividades.length ?? 0} · v
            {versionB?.version} tiene {versionB?.actividades.length ?? 0}
          </p>
        </div>

        <DiffTable titulo="Datos del responsable" filas={diffResponsable} />
        {diffDpd.length > 0 && <DiffTable titulo="Datos del DPD" filas={diffDpd} />}
      </div>
    </Modal>
  );
}

function DiffTable({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { clave: string; valorA: string; valorB: string; distinto: boolean }[];
}) {
  if (filas.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold text-gray-700">{titulo}</h3>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-bac-gray-alt text-bac-gray-text">
            <th className="px-2 py-1">Campo</th>
            <th className="px-2 py-1">A</th>
            <th className="px-2 py-1">B</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.clave} className={f.distinto ? "bg-amber-50" : ""}>
              <td className="px-2 py-1 font-medium text-gray-700">{f.clave}</td>
              <td className="px-2 py-1 text-gray-800">{f.valorA}</td>
              <td className="px-2 py-1 text-gray-800">{f.valorB}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
