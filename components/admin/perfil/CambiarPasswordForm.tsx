"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cambiarMiPassword } from "@/lib/admin/perfil-actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

export function CambiarPasswordForm() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    if (nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    startTransition(async () => {
      try {
        await cambiarMiPassword(actual, nueva);
        setMensaje("Contraseña actualizada correctamente.");
        setActual("");
        setNueva("");
        setConfirmar("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-bac-gray-border bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Cambiar contraseña</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Contraseña actual</label>
          <div className="relative">
            <input
              required
              type={mostrar ? "text" : "password"}
              className={INPUT_CLASS}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setMostrar(!mostrar)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-bac-gray-text hover:text-gray-700"
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nueva contraseña</label>
          <input
            required
            type={mostrar ? "text" : "password"}
            className={INPUT_CLASS}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Confirmar nueva contraseña
          </label>
          <input
            required
            type={mostrar ? "text" : "password"}
            className={INPUT_CLASS}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </div>

        {mensaje && <p className="text-sm text-bac-score-verde">{mensaje}</p>}
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}

        <button
          type="submit"
          disabled={isPending || !actual || !nueva || !confirmar}
          className="rounded-lg bg-bac-red px-5 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
        >
          {isPending ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
