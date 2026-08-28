"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ActividadSemanalChart({ data }: { data: { semana: string; acciones: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-bac-gray-text">
        Aún no hay actividad registrada.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [`${value} acciones`, ""]}
          contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }}
        />
        <Line type="monotone" dataKey="acciones" stroke="#0891B2" strokeWidth={2} dot={{ r: 3, fill: "#0891B2" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
