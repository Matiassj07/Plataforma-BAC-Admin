"use client";

import { useState } from "react";
import { Cloud, FolderGit2 } from "lucide-react";
import type { IntegracionAlmacenamiento, ProveedorAlmacenamiento } from "@/lib/admin/almacenamiento";
import { ProveedorCard } from "./ProveedorCard";
import { IntegracionModal } from "./IntegracionModal";

const PROVEEDORES: { id: ProveedorAlmacenamiento; nombre: string; icon: typeof Cloud }[] = [
  { id: "sharepoint", nombre: "SharePoint", icon: FolderGit2 },
  { id: "onedrive", nombre: "OneDrive", icon: Cloud },
];

export function AlmacenamientoShell({
  integraciones: integracionesInit,
}: {
  integraciones: IntegracionAlmacenamiento[];
}) {
  const [integraciones, setIntegraciones] = useState(integracionesInit);
  const [editando, setEditando] = useState<ProveedorAlmacenamiento | null>(null);

  async function refrescar() {
    const res = await fetch("/admin/api/get-integraciones-almacenamiento");
    const data = await res.json();
    if (res.ok && data.integraciones) setIntegraciones(data.integraciones);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PROVEEDORES.map((p) => {
          const integracion = integraciones.find((i) => i.proveedor === p.id) || null;
          return (
            <ProveedorCard
              key={p.id}
              proveedorId={p.id}
              nombre={p.nombre}
              Icon={p.icon}
              integracion={integracion}
              onConfigurar={() => setEditando(p.id)}
              onRefrescar={refrescar}
            />
          );
        })}
      </div>

      {editando && (
        <IntegracionModal
          proveedorId={editando}
          integracion={integraciones.find((i) => i.proveedor === editando) || undefined}
          onClose={() => setEditando(null)}
          onSaved={refrescar}
        />
      )}
    </div>
  );
}
