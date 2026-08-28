"use client";

import { useState, useTransition } from "react";
import { Clipboard, Eye, EyeOff, KeyRound, Shuffle } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { actualizarCredencialesCliente } from "@/lib/admin/actions";
import { generarPassword } from "@/lib/utils";
import type { ClienteListItem } from "@/lib/admin/clientes";

export function CredencialesClienteModal({
  cliente,
  onClose,
}: {
  cliente: ClienteListItem;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function copiarCredenciales() {
    const texto = `Empresa: ${cliente.nombre_empresa}\nCorreo: ${cliente.email}${
      password ? `\nContraseña: ${password}` : ""
    }`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function restablecerPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);

    startTransition(async () => {
      try {
        await actualizarCredencialesCliente(cliente.id, password);
        setMensaje("Contraseña actualizada correctamente.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
      }
    });
  }

  return (
    <Modal title={`Credenciales — ${cliente.nombre_empresa}`} onClose={onClose}>
      <form onSubmit={restablecerPassword} className="space-y-4">
        <div className="rounded-lg bg-bac-gray-alt p-4 text-sm">
          <div className="mb-2 flex justify-between gap-3">
            <span className="text-bac-gray-text">Empresa</span>
            <span className="text-right font-medium text-gray-900">{cliente.nombre_empresa}</span>
          </div>
          <div className="mb-2 flex justify-between gap-3">
            <span className="text-bac-gray-text">Usuario / Correo</span>
            <span className="text-right font-medium text-gray-900">{cliente.email}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-bac-gray-text">Contraseña</span>
            <span className="text-right text-xs text-bac-gray-text italic">
              Por seguridad no se almacena en texto plano
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Nueva contraseña
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                required
                type={mostrarPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-bac-gray-border px-3 py-2 pr-9 font-mono text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-bac-gray-text hover:text-gray-700"
              >
                {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setPassword(generarPassword()); setMostrarPassword(true); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              <Shuffle className="h-3.5 w-3.5" /> Generar
            </button>
          </div>
          <p className="mt-1 text-xs text-bac-gray-text">Solo si desea cambiarla</p>
        </div>

        {mensaje && <p className="text-sm text-bac-score-verde">{mensaje}</p>}
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={copiarCredenciales}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Clipboard className="h-3.5 w-3.5" /> {copiado ? "Copiado" : "Copiar"}
          </button>
          <button
            type="submit"
            disabled={isPending || !password}
            className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {isPending ? "Actualizando..." : "Restablecer contraseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
