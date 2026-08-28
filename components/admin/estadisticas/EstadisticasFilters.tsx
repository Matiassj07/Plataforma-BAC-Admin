"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TIPO_USUARIO_LABELS } from "@/lib/types";

const SELECT_CLASS =
  "rounded-lg border border-bac-gray-border bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function EstadisticasFilters({ sectores }: { sectores: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/estadisticas?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={SELECT_CLASS}
        value={searchParams.get("periodo") ?? ""}
        onChange={(e) => updateParam("periodo", e.target.value)}
      >
        <option value="">Período: todo</option>
        <option value="3">Últimos 3 meses</option>
        <option value="6">Últimos 6 meses</option>
        <option value="12">Últimos 12 meses</option>
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
        value={searchParams.get("tipoUsuario") ?? ""}
        onChange={(e) => updateParam("tipoUsuario", e.target.value)}
      >
        <option value="">Todos los tipos</option>
        {Object.entries(TIPO_USUARIO_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
