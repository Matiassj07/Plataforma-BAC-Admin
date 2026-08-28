"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DistribucionScoreChart({
  data,
}: {
  data: { rango: string; total: number; color: string }[];
}) {
  const total = data.reduce((a, d) => a + d.total, 0);
  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-bac-gray-text">
        Aún no hay scores registrados.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <XAxis dataKey="rango" tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [`${value} clientes`, ""]}
          contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={`#${d.color}`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
