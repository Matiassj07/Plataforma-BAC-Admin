"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Pencil, Bell } from "lucide-react";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { TIPO_USUARIO_LABELS } from "@/lib/types";
import { diasDesde, formatearFecha } from "@/lib/utils";
import { EditarClienteModal } from "@/components/admin/clientes/EditarClienteModal";
import { EnviarCorreoModal } from "@/components/admin/clientes/EnviarCorreoModal";
import { CredencialesClienteModal } from "@/components/admin/clientes/CredencialesClienteModal";
import type { ClienteListItem } from "@/lib/admin/clientes";
import type { Profile } from "@/lib/types";

interface NotificacionCliente {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  modulo: string | null;
  leida: boolean;
  created_at: string;
}

export function ExpedienteHeader({
  cliente,
  score,
  notificaciones = [],
}: {
  cliente: Profile;
  score: number | null;
  notificaciones?: NotificacionCliente[];
}) {
  const [editando, setEditando] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [credenciales, setCredenciales] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  useEffect(() => {
    if (!showNotif) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotif]);
  const dias = diasDesde(cliente.ultima_actividad);

  const clienteComoListItem: ClienteListItem = {
    id: cliente.id,
    nombre_empresa: cliente.nombre_empresa,
    email: cliente.email,
    tipo_usuario: cliente.tipo_usuario,
    sector: cliente.sector,
    es_pro: cliente.es_pro,
    pro_aprobado_por_admin: cliente.pro_aprobado_por_admin,
    suspendido: cliente.suspendido,
    ultima_actividad: cliente.ultima_actividad,
    created_at: cliente.created_at,
    score,
    docsCount: 0,
    telefono: cliente.telefono,
    ruc: cliente.ruc,
    direccion: cliente.direccion,
    web: cliente.web,
    dpd_tipo: cliente.dpd_tipo ?? null,
    dpd_activo: cliente.dpd_activo ?? false,
  };

  return (
    <div className="space-y-4">
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1 text-sm text-bac-gray-text hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      <div className="flex flex-col justify-between gap-4 rounded-xl border border-bac-gray-border bg-white p-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{cliente.nombre_empresa}</h1>
            <ScoreBadge score={score} />
            {cliente.suspendido && (
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                Suspendida
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-bac-gray-text">
            {cliente.sector ?? "Sin sector"} · {TIPO_USUARIO_LABELS[cliente.tipo_usuario]} · PRO{" "}
            {cliente.pro_aprobado_por_admin ? "✓" : "✗"}
          </p>
          <p className="mt-1 text-xs text-bac-gray-text" suppressHydrationWarning>
            Registrado el {formatearFecha(cliente.created_at)} · Última actividad:{" "}
            {dias === null ? "sin registro" : `hace ${dias} día${dias !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              <Bell className="h-3.5 w-3.5" />
              {noLeidas > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-bac-red px-1 text-[10px] font-bold text-white">
                  {noLeidas > 99 ? "99+" : noLeidas}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-10 z-30 w-80 max-h-80 overflow-y-auto rounded-xl border border-bac-gray-border bg-white shadow-lg">
                <div className="border-b border-bac-gray-border px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900">Notificaciones del cliente</p>
                </div>
                {notificaciones.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-bac-gray-text">Sin notificaciones</p>
                ) : (
                  notificaciones.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      className={`border-b border-gray-50 px-3 py-2 text-xs ${n.leida ? "bg-white" : "bg-blue-50"}`}
                    >
                      <p className="font-medium text-gray-800">{n.titulo}</p>
                      {n.descripcion && <p className="text-bac-gray-text">{n.descripcion}</p>}
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {n.modulo && <span className="mr-1 rounded bg-gray-100 px-1 py-0.5">{n.modulo}</span>}
                        {new Date(n.created_at).toLocaleString("es")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setEditando(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar datos
          </button>
          <button
            onClick={() => setEnviandoCorreo(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Mail className="h-3.5 w-3.5" /> Enviar correo
          </button>
          <button
            onClick={() => setCredenciales(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
>
  Credenciales
</button>
        </div>
      </div>

      {editando && (
        <EditarClienteModal cliente={clienteComoListItem} onClose={() => setEditando(false)} />
      )}
      {enviandoCorreo && (
        <EnviarCorreoModal cliente={clienteComoListItem} onClose={() => setEnviandoCorreo(false)} />
      )}
      {credenciales && (
        <CredencialesClienteModal cliente={clienteComoListItem} onClose={() => setCredenciales(false)} />
      )}
    </div>
  );
}
