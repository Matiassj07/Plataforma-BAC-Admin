"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Copy, Check } from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import { EmpleadoModal } from "./EmpleadoModal";
import { eliminarEmpleado } from "@/lib/admin/expediente-actions";
import { Modal } from "@/components/admin/Modal";
import type { PersonalItem } from "@/lib/admin/expediente";

const ROL_BADGE: Record<string, { label: string; cls: string }> = {
  contador: { label: "Contador", cls: "bg-blue-100 text-blue-700" },
  asistente: { label: "Asistente", cls: "bg-amber-100 text-amber-700" },
  cliente: { label: "Cliente", cls: "bg-gray-100 text-gray-600" },
};

export function PersonalTab({ clienteId, personal }: { clienteId: string; personal: PersonalItem[] }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<PersonalItem | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreated(c: { email: string; password: string }) {
    setCreds(c);
  }

  function handleDelete(emp: PersonalItem) {
    if (!confirm(`¿Eliminar a ${emp.nombre ?? "este empleado"}? Se eliminará también su cuenta de acceso.`)) return;
    startTransition(async () => {
      try {
        await eliminarEmpleado(emp.id, clienteId);
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-3 py-1.5 text-sm font-medium text-white hover:bg-bac-red-dark"
        >
          <Plus className="h-3.5 w-3.5" /> Añadir empleado
        </button>
      </div>

      {personal.length === 0 ? (
        <p className="text-sm text-bac-gray-text">Sin empleados registrados.</p>
      ) : (
        <div className="rounded-xl border border-bac-gray-border bg-white overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-bac-gray-border bg-bac-gray-alt text-xs font-medium uppercase tracking-wide text-bac-gray-text">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3">Área</th>
                <th className="px-4 py-3">Renovación</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((p) => {
                const badge = ROL_BADGE[p.rol ?? "cliente"] ?? ROL_BADGE.cliente;
                return (
                  <tr key={p.id} className="border-b border-bac-gray-border last:border-0">
                    <td className="px-4 py-3 text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-bac-gray-text text-xs">{p.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bac-gray-text">{p.cargo ?? "—"}</td>
                    <td className="px-4 py-3 text-bac-gray-text">{p.area ?? "—"}</td>
                    <td className="px-4 py-3 text-bac-gray-text">{formatearFecha(p.fecha_renovacion)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditando(p)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-bac-red hover:underline"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline disabled:opacity-60"
                        >
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && (
        <EmpleadoModal
          clienteId={clienteId}
          empleado={null}
          onClose={() => setModalAbierto(false)}
          onCreated={handleCreated}
        />
      )}
      {editando && (
        <EmpleadoModal clienteId={clienteId} empleado={editando} onClose={() => setEditando(null)} />
      )}

      {creds && (
        <Modal title="Credenciales del empleado" onClose={() => setCreds(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Guarda estas credenciales. La contraseña no se puede recuperar después.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-bac-gray-alt px-3 py-2">
              <div>
                <p className="text-[10px] text-bac-gray-text uppercase tracking-wide">Email</p>
                <p className="text-sm font-mono">{creds.email}</p>
              </div>
              <button onClick={() => copyText(creds.email, "email")} className="p-1 hover:bg-white rounded">
                {copied === "email" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-bac-gray-text" />}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bac-gray-alt px-3 py-2">
              <div>
                <p className="text-[10px] text-bac-gray-text uppercase tracking-wide">Contraseña</p>
                <p className="text-sm font-mono">{creds.password}</p>
              </div>
              <button onClick={() => copyText(creds.password, "pw")} className="p-1 hover:bg-white rounded">
                {copied === "pw" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-bac-gray-text" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCreds(null)}
              className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
