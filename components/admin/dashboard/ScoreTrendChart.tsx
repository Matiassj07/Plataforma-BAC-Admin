"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function ScoreTrendChart({ data }: { data: { mes: string; promedio: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-bac-gray-text">
        Aún no hay historial
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
        <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "#5B6472" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Score promedio"]}
          contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="promedio"
          stroke="#D2122E"
          strokeWidth={2}
          dot={{ r: 3, fill: "#D2122E" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
