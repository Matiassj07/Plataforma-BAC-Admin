"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, AlertCircle, Check } from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import { crearAdministrador, quitarAdministrador } from "@/lib/admin/configuracion-actions";
import type { AdminItem } from "@/lib/admin/configuracion-types";

export function AdministradoresTab({
  administradores: initial,
  actorId,
}: {
  administradores: AdminItem[];
  actorId: string;
}) {
  const [administradores, setAdministradores] = useState(initial);
  const [creando, setCreando] = useState(false);
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function crear() {
    setError(null);
    setOk(false);
    if (!nombreEmpresa.trim() || !email.trim() || !password) {
      setError("Completa nombre, correo y contraseña.");
      return;
    }
    startTransition(async () => {
      try {
        await crearAdministrador({ nombreEmpresa: nombreEmpresa.trim(), email: email.trim(), password });
        setAdministradores((arr) => [
          ...arr,
          { id: crypto.randomUUID(), email, nombre_empresa: nombreEmpresa, created_at: new Date().toISOString() },
        ]);
        setNombreEmpresa("");
        setEmail("");
        setPassword("");
        setCreando(false);
        setOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear administrador.");
      }
    });
  }

  function quitar(id: string) {
    if (!confirm("¿Quitar el rol de administrador a este usuario?")) return;
    startTransition(async () => {
      try {
        await quitarAdministrador(id, actorId);
        setAdministradores((arr) => arr.filter((a) => a.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al quitar administrador.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <button
        onClick={() => setCreando((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-bac-red px-4 py-2 text-sm font-semibold text-white hover:bg-bac-red-dark"
      >
        <Plus className="h-4 w-4" />
        Nuevo administrador
      </button>

      {creando && (
        <div className="space-y-3 rounded-lg border border-bac-gray-border bg-white p-4">
          <input
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            placeholder="Nombre"
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
          <button
            onClick={crear}
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Creando..." : "Crear administrador"}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-bac-score-rojo">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-bac-score-verde">
          <Check className="h-4 w-4 shrink-0" />
          Administrador creado correctamente.
        </div>
      )}

      <div className="divide-y divide-bac-gray-border rounded-lg border border-bac-gray-border bg-white">
        {administradores.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{a.nombre_empresa}</p>
              <p className="text-xs text-bac-gray-text">
                {a.email} · Desde {formatearFecha(a.created_at)}
              </p>
            </div>
            {a.id !== actorId && (
              <button
                onClick={() => quitar(a.id)}
                className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-bac-score-rojo hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
