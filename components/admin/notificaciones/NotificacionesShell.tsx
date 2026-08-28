"use client";

import { useState, useTransition } from "react";
import { Bell, Check, AlertCircle } from "lucide-react";
import { History } from "lucide-react";
import type { ConfigNotificaciones, HistorialNotificacion } from "@/lib/admin/notificaciones-types";
import { TIPOS_ALERTA } from "@/lib/admin/notificaciones-types";
import { guardarConfigNotificaciones } from "@/lib/admin/notificaciones-actions";
import { NotificacionesHistorialTab } from "./NotificacionesHistorialTab";

export function NotificacionesShell({
  config: configInicial,
  historial,
}: {
  config: ConfigNotificaciones | null;
  historial: HistorialNotificacion[];
}) {
  const [tab, setTab] = useState<"config" | "historial">("config");
  const [config, setConfig] = useState(configInicial);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(key: (typeof TIPOS_ALERTA)[number]["key"]) {
    if (!config) return;
    setConfig({ ...config, [key]: !config[key] });
    setOk(false);
  }

  function guardar() {
    if (!config) return;
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await guardarConfigNotificaciones({
          id: config.id,
          nuevo_cliente_registrado: config.nuevo_cliente_registrado,
          analisis_completado: config.analisis_completado,
          brecha_critica: config.brecha_critica,
          doc_sin_actualizar: config.doc_sin_actualizar,
          brecha_seguridad_registrada: config.brecha_seguridad_registrada,
          score_bajo: config.score_bajo,
          cliente_inactivo: config.cliente_inactivo,
          contrato_por_vencer: config.contrato_por_vencer,
        });
        setOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-bac-gray-border">
        <button
          onClick={() => setTab("config")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            tab === "config"
              ? "border-bac-red text-gray-900"
              : "border-transparent text-bac-gray-text hover:text-gray-900"
          }`}
        >
          <Bell className="h-4 w-4" />
          Configuración
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
            tab === "historial"
              ? "border-bac-red text-gray-900"
              : "border-transparent text-bac-gray-text hover:text-gray-900"
          }`}
        >
          <History className="h-4 w-4" />
          Historial
        </button>
      </div>

      {tab === "config" && (
        <div className="max-w-2xl space-y-4">
          {!config ? (
            <p className="text-sm text-bac-gray-text">No hay configuración de notificaciones disponible.</p>
          ) : (
            <>
              <div className="divide-y divide-bac-gray-border rounded-lg border border-bac-gray-border bg-white">
                {TIPOS_ALERTA.map((t) => (
                  <label
                    key={t.key}
                    className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3 hover:bg-bac-gray-alt/40"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.label}</p>
                      <p className="text-xs text-bac-gray-text">{t.descripcion}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config[t.key]}
                      onChange={() => toggle(t.key)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-bac-gray-border accent-bac-red"
                    />
                  </label>
                ))}
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
            </>
          )}
        </div>
      )}

      {tab === "historial" && <NotificacionesHistorialTab historial={historial} />}
    </div>
  );
}
