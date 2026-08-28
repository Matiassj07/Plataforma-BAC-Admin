"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatearFecha } from "@/lib/utils";

export function ClienteScoreChart({ data }: { data: { mes: string; score: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-bac-gray-text">
        Aún no hay historial de score para este cliente.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    mesLabel: (() => {
      const dt = new Date(`${d.mes}T00:00:00`);
      return `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    })(),
    score: d.score,
    mesCompleto: formatearFecha(d.mes),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" />
        <XAxis dataKey="mesLabel" tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Score"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.mesCompleto ?? ""}
          contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }}
        />
        <Line type="monotone" dataKey="score" stroke="#D2122E" strokeWidth={2} dot={{ r: 3, fill: "#D2122E" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
