"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clipboard, Mail } from "lucide-react";
import { enviarCredencialesPorCorreo, type CrearUsuarioResultado } from "@/lib/admin/crear-usuario-actions";

type ResultadoConPassword = CrearUsuarioResultado & { password: string };
import { TIPO_USUARIO_LABELS } from "@/lib/types";

export function ConfirmacionCreacion({
  resultado,
  onCrearOtro,
}: {
  resultado: ResultadoConPassword;
  onCrearOtro: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [envio, setEnvio] = useState<"idle" | "enviado" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleCopiar() {
    const texto = `Empresa: ${resultado.nombreEmpresa}\nCorreo: ${resultado.email}\nContraseña: ${resultado.password}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleEnviarCorreo() {
    startTransition(async () => {
      const { estado } = await enviarCredencialesPorCorreo(resultado);
      setEnvio(estado as "enviado" | "error");
    });
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-bac-gray-border bg-white p-6">
      <div className="mb-4 flex items-center gap-2 text-bac-score-verde">
        <CheckCircle2 className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Usuario creado correctamente</h1>
      </div>

      <dl className="space-y-2 rounded-lg bg-bac-gray-alt p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-bac-gray-text">Empresa:</dt>
          <dd className="font-medium text-gray-900">{resultado.nombreEmpresa}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-bac-gray-text">Correo:</dt>
          <dd className="font-medium text-gray-900">{resultado.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-bac-gray-text">Contraseña:</dt>
          <dd className="font-mono font-medium text-gray-900">{resultado.password}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-bac-gray-text">Tipo:</dt>
          <dd className="font-medium text-gray-900">{TIPO_USUARIO_LABELS[resultado.tipoUsuario]}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-bac-gray-text">PRO:</dt>
          <dd className={`font-medium ${resultado.proAprobado ? "text-bac-score-verde" : "text-bac-score-rojo"}`}>
            {resultado.proAprobado ? "Aprobado" : "No aprobado"}
          </dd>
        </div>
      </dl>

      {envio !== "idle" && (
        <p className={`mt-3 text-sm ${envio === "enviado" ? "text-bac-score-verde" : "text-bac-score-rojo"}`}>
          {envio === "enviado"
            ? "✓ Correo con las credenciales enviado."
            : "✗ No hay proveedor de correo configurado (ver Correos en el menú)."}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={handleCopiar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          <Clipboard className="h-3.5 w-3.5" /> {copiado ? "Copiado" : "Copiar credenciales"}
        </button>
        <button
          onClick={handleEnviarCorreo}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
        >
          <Mail className="h-3.5 w-3.5" /> {isPending ? "Enviando..." : "Enviar por correo"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-bac-gray-border pt-3">
        <Link
          href={`/admin/clientes/${resultado.id}`}
          className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
        >
          Ver expediente →
        </Link>
        <button
          onClick={onCrearOtro}
          className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          Crear otro usuario
        </button>
      </div>
    </div>
  );
}
