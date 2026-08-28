"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DocumentosPorClienteChart({ data }: { data: { nombre: string; docs: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-bac-gray-text">
        Aún no hay clientes.
      </div>
    );
  }

  const altura = Math.max(220, data.length * 28);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" horizontal={false} />
        <XAxis type="number" domain={[0, 12]} tick={{ fontSize: 11, fill: "#5B6472" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="nombre"
          width={160}
          tick={{ fontSize: 11, fill: "#374151" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value} documentos`, ""]}
          contentStyle={{ borderRadius: 8, borderColor: "#E4E7EC", fontSize: 12 }}
        />
        <Bar dataKey="docs" fill="#D2122E" radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
