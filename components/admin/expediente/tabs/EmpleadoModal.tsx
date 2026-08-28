"use client";

import { useState, useTransition } from "react";
import { Key } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { DateInput } from "@/components/DateInput";
import { crearEmpleado, actualizarEmpleado, type DatosEmpleado } from "@/lib/admin/expediente-actions";
import type { PersonalItem } from "@/lib/admin/expediente";

const INPUT_CLASS =
  "w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red";

const ROL_DESCRIPTIONS: Record<string, string> = {
  contador: "Creación de carpetas, estructura y asignación de usuarios. No puede crear usuarios.",
  asistente: "Revisión de repositorio y carga de documentos.",
  cliente: "Acceso solo visual a repositorio.",
};

function generarPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export function EmpleadoModal({
  clienteId,
  empleado,
  onClose,
  onCreated,
}: {
  clienteId: string;
  empleado: PersonalItem | null;
  onClose: () => void;
  onCreated?: (creds: { email: string; password: string }) => void;
}) {
  const isEdit = !!empleado;
  const [form, setForm] = useState<DatosEmpleado & { email: string; password: string; rol: "contador" | "asistente" | "cliente" }>({
    nombre: empleado?.nombre ?? "",
    cargo: empleado?.cargo ?? "",
    area: empleado?.area ?? "",
    fecha_firma: empleado?.fecha_firma ?? "",
    fecha_renovacion: empleado?.fecha_renovacion ?? "",
    email: empleado?.email ?? "",
    password: isEdit ? "" : generarPassword(),
    rol: (empleado?.rol as "contador" | "asistente" | "cliente") ?? "cliente",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    if (!isEdit && !form.email.trim()) { setError("El email es obligatorio"); return; }
    if (!isEdit && !form.password) { setError("La contraseña es obligatoria"); return; }

    startTransition(async () => {
      try {
        if (isEdit) {
          await actualizarEmpleado(empleado.id, clienteId, {
            nombre: form.nombre,
            cargo: form.cargo,
            area: form.area,
            fecha_firma: form.fecha_firma,
            fecha_renovacion: form.fecha_renovacion,
            rol: form.rol,
            password: form.password || undefined,
          });
          onClose();
        } else {
          await crearEmpleado(clienteId, {
            nombre: form.nombre,
            cargo: form.cargo,
            area: form.area,
            fecha_firma: form.fecha_firma,
            fecha_renovacion: form.fecha_renovacion,
            email: form.email,
            password: form.password,
            rol: form.rol,
          });
          onCreated?.({ email: form.email, password: form.password });
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <Modal title={isEdit ? "Editar empleado" : "Añadir empleado"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nombre completo *</label>
          <input
            required
            className={INPUT_CLASS}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>

        {!isEdit && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
            <input
              type="email"
              required
              className={INPUT_CLASS}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            {isEdit ? "Nueva contraseña (vacío = no cambiar)" : "Contraseña *"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className={`${INPUT_CLASS} font-mono`}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, password: generarPassword() })}
              className="rounded-lg border border-bac-gray-border px-3 py-2 text-sm hover:bg-bac-gray-alt"
              title="Generar contraseña"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Rol *</label>
          <select
            className={`${INPUT_CLASS} bg-white`}
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as "contador" | "asistente" | "cliente" })}
          >
            <option value="contador">Contador</option>
            <option value="asistente">Asistente</option>
            <option value="cliente">Cliente</option>
          </select>
          <p className="mt-1 text-[10px] text-bac-gray-text">{ROL_DESCRIPTIONS[form.rol]}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Cargo</label>
            <input
              className={INPUT_CLASS}
              value={form.cargo ?? ""}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Área</label>
            <input
              className={INPUT_CLASS}
              value={form.area ?? ""}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Fecha de firma</label>
            <DateInput
              className={INPUT_CLASS}
              value={form.fecha_firma ?? ""}
              onChange={(v) => setForm({ ...form, fecha_firma: v })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Fecha de renovación</label>
            <DateInput
              className={INPUT_CLASS}
              value={form.fecha_renovacion ?? ""}
              onChange={(v) => setForm({ ...form, fecha_renovacion: v })}
            />
          </div>
        </div>
        {error && <p className="text-sm text-bac-score-rojo">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
