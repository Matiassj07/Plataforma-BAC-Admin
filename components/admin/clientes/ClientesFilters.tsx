"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TIPO_USUARIO_LABELS } from "@/lib/types";

const SELECT_CLASS =
  "rounded-lg border border-bac-gray-border bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function ClientesFilters({ sectores }: { sectores: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/clientes?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={SELECT_CLASS}
        value={searchParams.get("tipo") ?? ""}
        onChange={(e) => updateParam("tipo", e.target.value)}
      >
        <option value="">Todos los tipos</option>
        {Object.entries(TIPO_USUARIO_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={SELECT_CLASS}
        value={searchParams.get("sector") ?? ""}
        onChange={(e) => updateParam("sector", e.target.value)}
      >
        <option value="">Todos los sectores</option>
        {sectores.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        className={SELECT_CLASS}
        value={searchParams.get("score") ?? ""}
        onChange={(e) => updateParam("score", e.target.value)}
      >
        <option value="">Score: todos</option>
        <option value="bajo">Bajo (&lt;40%)</option>
        <option value="medio">Medio (40-70%)</option>
        <option value="alto">Alto (&gt;70%)</option>
      </select>

      <select
        className={SELECT_CLASS}
        value={searchParams.get("pro") ?? ""}
        onChange={(e) => updateParam("pro", e.target.value)}
      >
        <option value="">Estado PRO: todos</option>
        <option value="aprobado">Aprobado</option>
        <option value="no_aprobado">No aprobado</option>
      </select>

      <select
        className={SELECT_CLASS}
        value={searchParams.get("dpd") ?? ""}
        onChange={(e) => updateParam("dpd", e.target.value)}
      >
        <option value="">DPD: todos</option>
        <option value="activo">DPD activo</option>
        <option value="no_activo">DPD no activo</option>
      </select>

      <select
        className={SELECT_CLASS}
        value={searchParams.get("actividad") ?? ""}
        onChange={(e) => updateParam("actividad", e.target.value)}
      >
        <option value="">Actividad: todos</option>
        <option value="activo">Activo (≤30d)</option>
        <option value="inactivo">Inactivo (&gt;30d)</option>
      </select>

    </div>
  );
}
