"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#D2122E", "#0891B2", "#CA8A04", "#16A34A", "#7C3AED", "#EA580C", "#5B6472", "#0284C7"];

export function SectorDonutChart({ data }: { data: { sector: string; total: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-bac-gray-text">
        Aún no hay clientes
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="sector"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 12, color: "#5B6472" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
