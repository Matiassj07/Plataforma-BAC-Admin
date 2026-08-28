"use client";

import { useState } from "react";
import { CrearUsuarioForm } from "./CrearUsuarioForm";
import { ConfirmacionCreacion } from "./ConfirmacionCreacion";
import type { CrearUsuarioResultado } from "@/lib/admin/crear-usuario-actions";
import type { SectorCustom } from "@/lib/admin/sectores-actions";

export function CrearUsuarioFlow({ sectoresCustom }: { sectoresCustom: SectorCustom[] }) {
  const [resultado, setResultado] = useState<(CrearUsuarioResultado & { password: string }) | null>(null);

  if (resultado) {
    return <ConfirmacionCreacion resultado={resultado} onCrearOtro={() => setResultado(null)} />;
  }

  return <CrearUsuarioForm onCreado={setResultado} sectoresCustom={sectoresCustom} />;
}
