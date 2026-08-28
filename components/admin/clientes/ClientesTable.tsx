"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, MoreHorizontal } from "lucide-react";
import { Dropdown } from "@/components/admin/Dropdown";
import { ScoreBadge } from "@/components/admin/ScoreBadge";
import { TIPO_USUARIO_LABELS } from "@/lib/types";
import type { ClienteListItem } from "@/lib/admin/clientes";
import { setProAprobado } from "@/lib/admin/actions";
import { esProEfectivo } from "@/lib/pro";
import { EditarClienteModal } from "./EditarClienteModal";
import { EnviarCorreoModal } from "./EnviarCorreoModal";
import { SuspenderClienteModal } from "./SuspenderClienteModal";
import { EliminarClienteModal } from "./EliminarClienteModal";
import { CredencialesClienteModal } from "./CredencialesClienteModal";

export function ClientesTable({
  clientes,
  proGlobalActivo,
}: {
  clientes: ClienteListItem[];
  proGlobalActivo: boolean;
}) {
  const [editando, setEditando] = useState<ClienteListItem | null>(null);
  const [enviandoCorreo, setEnviandoCorreo] = useState<ClienteListItem | null>(null);
  const [credenciales, setCredenciales] = useState<ClienteListItem | null>(null);
  const [suspendiendo, setSuspendiendo] = useState<ClienteListItem | null>(null);
  const [eliminando, setEliminando] = useState<ClienteListItem | null>(null);
  const [isPending, startProTransition] = useTransition();
  const [proPendingId, setProPendingId] = useState<string | null>(null);

  function handleTogglePro(cliente: ClienteListItem) {
    setProPendingId(cliente.id);
    startProTransition(async () => {
      await setProAprobado(cliente.id, !cliente.pro_aprobado_por_admin);
      setProPendingId(null);
    });
  }

  async function handleDescargarExcel() {
    const { exportarClientesXlsx } = await import("@/lib/export-clientes-excel");
    await exportarClientesXlsx(clientes);
  }

  return (
    <>
      <div className="flex justify-end mb-2">
        <button
          onClick={handleDescargarExcel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          <Download className="h-3.5 w-3.5" /> Descargar tablas
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-bac-gray-border bg-white">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-bac-gray-border bg-bac-gray-alt text-xs font-medium uppercase tracking-wide text-bac-gray-text">
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">DPD</th>
              <th className="px-4 py-3">Docs subidos</th>
              <th className="px-4 py-3">PRO</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-bac-gray-text">
                  No hay clientes que coincidan con los filtros.
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr
                key={c.id}
                className="border-b border-bac-gray-border last:border-0 hover:bg-bac-gray-alt/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clientes/${c.id}`}
                    className="font-medium text-gray-900 hover:text-bac-red hover:underline"
                  >
                    {c.nombre_empresa}
                  </Link>
                  <p className="text-xs text-bac-gray-text">{c.email}</p>
                  {c.suspendido && (
                    <span className="mt-0.5 inline-block rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                      Suspendida
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{TIPO_USUARIO_LABELS[c.tipo_usuario]}</td>
                <td className="px-4 py-3 text-gray-700">{c.sector ?? "—"}</td>
                <td className="px-4 py-3">
                  <ScoreBadge score={c.score} />
                </td>
                <td className="px-4 py-3">
                  {c.dpd_activo ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-bac-score-verde">
                      ✓ {c.dpd_tipo === "interno" ? "Interno" : "Externo"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-bac-score-rojo">
                      ✗ No activo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{c.docsCount}</td>
                <td className="px-4 py-3">
                  {esProEfectivo(c, proGlobalActivo) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-bac-score-verde">
                      ✓ {c.tipo_usuario === "interno_bac" ? "Automático" : "Aprobado"}
                    </span>
                  ) : c.pro_aprobado_por_admin && !proGlobalActivo ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
                      title="Aprobado individualmente, pero el PRO está desactivado globalmente"
                    >
                      ⚠ Pausado (global)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-bac-score-rojo">
                      ✗ No aprobado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Dropdown
                    trigger={() => (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-bac-gray-text hover:bg-bac-gray-alt">
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    )}
                  >
                    {(close) => (
                      <div className="py-1 text-sm">
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          onClick={close}
                          className="block px-3 py-2 text-left text-gray-700 hover:bg-bac-gray-alt"
                        >
                          Ver expediente completo
                        </Link>
                        <button
                          onClick={() => {
                            close();
                            setEditando(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-bac-gray-alt"
                        >
                          Editar datos del cliente
                        </button>
                        <button
                          disabled={isPending && proPendingId === c.id}
                          onClick={() => {
                            close();
                            handleTogglePro(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
                        >
                          {c.pro_aprobado_por_admin ? "Revocar PRO" : "Aprobar PRO"}
                        </button>
                        <button
                          onClick={() => {
                            close();
                            setEnviandoCorreo(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-bac-gray-alt"
                        >
                          Enviar correo
                        </button>
                        <button
                          onClick={() => {
                            close();
                            setCredenciales(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-bac-gray-alt"
                        >
                          Credenciales
                        </button>
                        <button
                          onClick={() => {
                            close();
                            setSuspendiendo(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-gray-700 hover:bg-bac-gray-alt"
                        >
                          {c.suspendido ? "Reactivar cuenta" : "Suspender cuenta"}
                        </button>
                        <button
                          onClick={() => {
                            close();
                            setEliminando(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-bac-score-rojo hover:bg-red-50"
                        >
                          Eliminar cliente
                        </button>
                      </div>
                    )}
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && <EditarClienteModal cliente={editando} onClose={() => setEditando(null)} />}
      {enviandoCorreo && (
        <EnviarCorreoModal cliente={enviandoCorreo} onClose={() => setEnviandoCorreo(null)} />
        )}
      {credenciales && (
        <CredencialesClienteModal cliente={credenciales} onClose={() => setCredenciales(null)} />
        )}
      {suspendiendo && (
        <SuspenderClienteModal cliente={suspendiendo} onClose={() => setSuspendiendo(null)} />
        )}
      {eliminando && (
        <EliminarClienteModal cliente={eliminando} onClose={() => setEliminando(null)} />
      )}
    </>
  );
}
