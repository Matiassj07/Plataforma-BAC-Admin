"use client";

import { useState, useTransition } from "react";
import { Check, AlertCircle } from "lucide-react";
import { guardarConfigCorreo } from "@/lib/admin/correos-actions";
import type { ConfigCorreo } from "@/lib/admin/correos";

export function CorreosConfigTab({ config }: { config: ConfigCorreo | null }) {
  const [proveedor, setProveedor] = useState<ConfigCorreo["proveedor"]>(config?.proveedor || null);
  const [smtpHost, setSmtpHost] = useState(config?.smtp_host || "");
  const [smtpPort, setSmtpPort] = useState(config?.smtp_port?.toString() || "587");
  const [smtpUser, setSmtpUser] = useState(config?.smtp_user || "");
  const [smtpPassword, setSmtpPassword] = useState(config?.smtp_password || "");
  const [tls, setTls] = useState(config?.tls ?? true);
  const [nombreRemitente, setNombreRemitente] = useState(config?.nombre_remitente || "");
  const [emailRespuesta, setEmailRespuesta] = useState(config?.email_respuesta || "");
  const [activo, setActivo] = useState(config?.activo ?? false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    setOk(false);
    if (!proveedor) {
      setError("Selecciona un proveedor de correo.");
      return;
    }
    startTransition(async () => {
      try {
        await guardarConfigCorreo({
          proveedor,
          smtp_host: smtpHost || undefined,
          smtp_port: smtpPort ? parseInt(smtpPort) : undefined,
          smtp_user: smtpUser || undefined,
          smtp_password: smtpPassword || undefined,
          tls,
          nombre_remitente: nombreRemitente || undefined,
          email_respuesta: emailRespuesta || undefined,
          activo,
        });
        setOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Proveedor de correo</label>
        <div className="grid grid-cols-2 gap-2">
          {(["outlook", "smtp_personalizado"] as const).map((p) => {
            const label = p === "smtp_personalizado" ? "SMTP personalizado" : "Outlook";
            return (
              <button
                key={p}
                onClick={() => {
                  setProveedor(p);
                  if (p === "outlook" && !smtpHost) setSmtpHost("smtp.office365.com");
                }}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                  proveedor === p
                    ? "border-bac-red bg-bac-red/5 text-bac-red"
                    : "border-bac-gray-border text-gray-700 hover:border-bac-red/30"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {proveedor && (
        <div className="space-y-3 rounded-lg bg-bac-gray-alt p-4">
          <h3 className="text-sm font-semibold text-gray-900">Datos del servidor</h3>
          <input
            type="text"
            placeholder="Host SMTP (ej. smtp.office365.com)"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Puerto (587)"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
            <input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              className="rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
          </div>
          <input
            type="password"
            placeholder="Contraseña"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
            className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nombre remitente"
              value={nombreRemitente}
              onChange={(e) => setNombreRemitente(e.target.value)}
              className="rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
            <input
              type="email"
              placeholder="Correo de respuesta"
              value={emailRespuesta}
              onChange={(e) => setEmailRespuesta(e.target.value)}
              className="rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tls}
              onChange={(e) => setTls(e.target.checked)}
              className="rounded border-bac-gray-border"
            />
            <span className="text-sm text-gray-900">Usar TLS</span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="activo"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="rounded border-bac-gray-border"
        />
        <label htmlFor="activo" className="text-sm font-medium text-gray-900">
          Configuración activa
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-bac-score-rojo">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-bac-score-verde">
          <Check className="h-4 w-4 shrink-0" />
          Configuración guardada correctamente.
        </div>
      )}

      <button
        onClick={guardar}
        disabled={isPending}
        className="rounded-lg bg-bac-red px-5 py-2 text-sm font-semibold text-white hover:bg-bac-red-dark disabled:opacity-60"
      >
        {isPending ? "Guardando..." : "Guardar configuración"}
      </button>
    </div>
  );
}
