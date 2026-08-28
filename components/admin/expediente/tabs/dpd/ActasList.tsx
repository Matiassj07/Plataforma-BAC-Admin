"use client";

import { useState, useTransition } from "react";
import { Download, Eye, Mail, Trash2, Upload } from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import { enviarActaAlCliente, obtenerUrlDescargaActa, obtenerUrlDescargaDpd, subirActaFirmadaAdmin } from "@/lib/admin/dpd-actions";
import { eliminarActaDpd } from "@/lib/admin/expediente-actions";
import type { DpdActa } from "@/lib/admin/dpd-types";
import { DetalleActaModal } from "./DetalleActaModal";

const ESTADO_LABELS: Record<DpdActa["estado"], { label: string; className: string }> = {
  pendiente_firma: { label: "⏳ Pendiente de firma", className: "text-amber-700" },
  firmada: { label: "✓ Firmada", className: "text-bac-score-verde" },
  archivada: { label: "Archivada", className: "text-bac-gray-text" },
};

export function ActasList({ clienteId, actas }: { clienteId: string; actas: DpdActa[] }) {
  const [detalle, setDetalle] = useState<DpdActa | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [mensajeEnvio, setMensajeEnvio] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleDescargar(acta: DpdActa) {
    const path = acta.url_acta_firmada ?? acta.url_acta_generada;
    if (!path) return;
    setDescargando(acta.id);
    try {
      const url = acta.url_acta_firmada
        ? await obtenerUrlDescargaDpd(clienteId, acta.url_acta_firmada)
        : await obtenerUrlDescargaActa(clienteId, path);
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${acta.numero_acta}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDescargando(null);
    }
  }

  async function handleSubirFirmada(actaId: string, file: File) {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        await subirActaFirmadaAdmin(actaId, clienteId, fd);
      } catch (err) {
        setMensajeEnvio(err instanceof Error ? err.message : "Error al subir acta firmada.");
      }
    });
  }

  function handleEnviar(acta: DpdActa) {
    setMensajeEnvio(null);
    setEnviando(acta.id);
    startTransition(async () => {
      try {
        const { estado } = await enviarActaAlCliente(acta.id, clienteId, acta.numero_acta);
        setMensajeEnvio(
          estado === "enviado" ? `${acta.numero_acta} enviada al cliente.` : "No hay proveedor de correo configurado."
        );
      } catch (err) {
        setMensajeEnvio(err instanceof Error ? err.message : "No se pudo enviar el acta.");
      } finally {
        setEnviando(null);
      }
    });
  }

  if (actas.length === 0) {
    return <p className="text-sm text-bac-gray-text">Este plan aún no tiene actas registradas.</p>;
  }

  return (
    <div className="space-y-2">
      {mensajeEnvio && <p className="text-xs text-bac-gray-text">{mensajeEnvio}</p>}
      {actas.map((acta) => {
        const estado = ESTADO_LABELS[acta.estado];
        const tieneArchivo = !!(acta.url_acta_firmada ?? acta.url_acta_generada);
        return (
          <div key={acta.id} className="rounded-lg border border-bac-gray-border bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {acta.numero_acta} — {formatearFecha(acta.created_at)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-bac-gray-text">
                  Hallazgo: {acta.descripcion_hallazgo}
                </p>
                <p className={`mt-1 text-xs font-medium ${estado.className}`}>{estado.label}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 text-xs">
                <button
                  onClick={() => handleDescargar(acta)}
                  disabled={!tieneArchivo || descargando === acta.id}
                  title={tieneArchivo ? undefined : "El PDF del acta aún no se ha generado"}
                  className="inline-flex items-center gap-1 rounded-lg border border-bac-gray-border px-2.5 py-1.5 font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  {descargando === acta.id ? "..." : acta.url_acta_firmada ? "Descargar firmada" : "Descargar acta"}
                </button>
                {acta.estado === "pendiente_firma" && (
                  <>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-bac-gray-border px-2.5 py-1.5 font-medium text-gray-700 hover:bg-bac-gray-alt">
                      <Upload className="h-3.5 w-3.5" />
                      {isPending ? "Subiendo..." : "Subir firmada"}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSubirFirmada(acta.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      onClick={() => handleEnviar(acta)}
                      disabled={isPending && enviando === acta.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-bac-gray-border px-2.5 py-1.5 font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {enviando === acta.id ? "Enviando..." : "Enviar al cliente"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDetalle(acta)}
                  className="inline-flex items-center gap-1 rounded-lg border border-bac-gray-border px-2.5 py-1.5 font-medium text-gray-700 hover:bg-bac-gray-alt"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver detalle
                </button>
                <button
                  onClick={() => {
                    if (!confirm("¿Eliminar esta acta?")) return;
                    startTransition(async () => {
                      await eliminarActaDpd(acta.id, clienteId);
                    });
                  }}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {detalle && <DetalleActaModal acta={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}
