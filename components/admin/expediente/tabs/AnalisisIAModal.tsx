"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { Modal } from "@/components/admin/Modal";

type TipoAnalisis = "rat" | "riesgos" | "brechas";

const CONFIG_ANALISIS: Record<
  TipoAnalisis,
  { titulo: string; descripcion: string; botonLabel: string; botonActivo: string }
> = {
  rat: {
    titulo: "Analizar RAT con IA",
    descripcion:
      "La IA revisará el Registro de Actividades de Tratamiento y detectará brechas de cumplimiento según la LOPDP de Ecuador. Se identificarán campos faltantes, bases de licitud incorrectas y medidas de seguridad insuficientes.",
    botonLabel: "Analizar RAT",
    botonActivo: "Analizando RAT...",
  },
  riesgos: {
    titulo: "Analizar Matriz de Riesgos con IA",
    descripcion:
      "La IA revisará la Matriz de Riesgos y evaluará si las probabilidades, impactos y medidas de mitigación son adecuados. Se identificarán riesgos subestimados y planes de mitigación insuficientes.",
    botonLabel: "Analizar Matriz",
    botonActivo: "Analizando Matriz...",
  },
  brechas: {
    titulo: "Generar Plan de Acción con IA",
    descripcion:
      "La IA analizará las brechas de cumplimiento registradas y generará un plan de acción priorizado con plazos, responsables y recursos necesarios para cada corrección.",
    botonLabel: "Generar Plan de Acción",
    botonActivo: "Generando plan...",
  },
};

const SEVERIDAD_STYLE: Record<string, string> = {
  critica: "bg-red-100 text-red-700 border-red-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baja: "bg-green-100 text-green-700 border-green-200",
};

const PRIORIDAD_STYLE: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-amber-100 text-amber-700",
  baja: "bg-green-100 text-green-700",
};

export function BotonAnalisisIA({
  tipo,
  disabled,
  onClick,
}: {
  tipo: TipoAnalisis;
  disabled?: boolean;
  onClick: () => void;
}) {
  const config = CONFIG_ANALISIS[tipo];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
    >
      <Sparkles className="h-3.5 w-3.5 text-bac-red" />
      {config.botonLabel}
      <span className="rounded border border-bac-gray-border bg-bac-gray-alt px-1.5 py-0.5 text-[10px] text-bac-gray-text">
        $x
      </span>
    </button>
  );
}

export function ConfirmacionIAModal({
  tipo,
  analizando,
  onConfirmar,
  onClose,
}: {
  tipo: TipoAnalisis;
  analizando: boolean;
  onConfirmar: () => void;
  onClose: () => void;
}) {
  const config = CONFIG_ANALISIS[tipo];

  return (
    <Modal title={config.titulo} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-bac-gray-border bg-bac-gray-alt p-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-bac-red" />
          <p className="text-sm text-gray-700">{config.descripcion}</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Costo del análisis
          </div>
          <p className="mt-1 text-sm text-amber-700">
            Este análisis tiene un costo de <span className="font-semibold">$x</span> por uso.
            El resultado se guardará en el expediente del cliente.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={analizando}
            className="rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={analizando}
            className="inline-flex items-center gap-2 rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            {analizando ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {config.botonActivo}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {config.botonLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ResultadoIABrechasModal({
  brechas,
  resumen,
  score,
  onClose,
}: {
  brechas: { campo: string; descripcion: string; severidad: string; articulo_lopdp: string; recomendacion: string }[];
  resumen: string;
  score: number | null;
  onClose: () => void;
}) {
  return (
    <Modal title="Resultado del análisis IA" onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        {resumen && (
          <div className="rounded-lg border border-bac-gray-border bg-bac-gray-alt p-3 text-sm text-gray-700">
            <p className="mb-1 text-xs font-semibold text-gray-900">Resumen</p>
            {resumen}
          </div>
        )}

        {score !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Score de cumplimiento:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                score >= 70
                  ? "bg-green-100 text-green-700"
                  : score >= 40
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {score}%
            </span>
          </div>
        )}

        {brechas.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-5 w-5" />
            No se detectaron brechas de cumplimiento.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-900">
              {brechas.length} brecha{brechas.length !== 1 ? "s" : ""} detectada{brechas.length !== 1 ? "s" : ""}
            </p>
            {brechas.map((b, i) => (
              <div key={i} className="rounded-lg border border-bac-gray-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{b.campo}</p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      SEVERIDAD_STYLE[b.severidad] ?? "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {b.severidad}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{b.descripcion}</p>
                <p className="mt-1 text-xs text-bac-gray-text">Art. {b.articulo_lopdp}</p>
                <div className="mt-2 rounded border border-bac-gray-border bg-bac-gray-alt p-2 text-xs text-gray-700">
                  <span className="font-medium">Recomendación:</span> {b.recomendacion}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ResultadoIAMatrizModal({
  hallazgos,
  resumen,
  riesgosCriticos,
  score,
  onClose,
}: {
  hallazgos: { actividad: string; problema: string; severidad: string; tipo: string; recomendacion: string }[];
  resumen: string;
  riesgosCriticos: number;
  score: number | null;
  onClose: () => void;
}) {
  const TIPO_LABEL: Record<string, string> = {
    riesgo_subestimado: "Riesgo subestimado",
    mitigacion_insuficiente: "Mitigación insuficiente",
    eipd_requerida: "EIPD requerida",
    medida_inadecuada: "Medida inadecuada",
  };

  return (
    <Modal title="Resultado del análisis IA — Matriz de Riesgos" onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        {resumen && (
          <div className="rounded-lg border border-bac-gray-border bg-bac-gray-alt p-3 text-sm text-gray-700">
            <p className="mb-1 text-xs font-semibold text-gray-900">Resumen</p>
            {resumen}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          {score !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Score de madurez:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                  score >= 70 ? "bg-green-100 text-green-700" : score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}
              >
                {score}%
              </span>
            </div>
          )}
          {riesgosCriticos > 0 && (
            <div className="flex items-center gap-1.5 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {riesgosCriticos} riesgo{riesgosCriticos !== 1 ? "s" : ""} crítico{riesgosCriticos !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {hallazgos.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-5 w-5" />
            No se detectaron problemas en la matriz de riesgos.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-900">
              {hallazgos.length} hallazgo{hallazgos.length !== 1 ? "s" : ""}
            </p>
            {hallazgos.map((h, i) => (
              <div key={i} className="rounded-lg border border-bac-gray-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{h.actividad}</p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      SEVERIDAD_STYLE[h.severidad] ?? "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {h.severidad}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{h.problema}</p>
                <p className="mt-1 text-xs text-bac-gray-text">{TIPO_LABEL[h.tipo] ?? h.tipo}</p>
                <div className="mt-2 rounded border border-bac-gray-border bg-bac-gray-alt p-2 text-xs text-gray-700">
                  <span className="font-medium">Recomendación:</span> {h.recomendacion}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ResultadoIAPlanModal({
  plan,
  resumen,
  totalAcciones,
  plazoTotal,
  onClose,
}: {
  plan: { brecha_origen: string; accion: string; prioridad: string; plazo_dias: number; responsable: string; recursos: string; indicador: string }[];
  resumen: string;
  totalAcciones: number;
  plazoTotal: number | null;
  onClose: () => void;
}) {
  return (
    <Modal title="Plan de Acción generado por IA" onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        {resumen && (
          <div className="rounded-lg border border-bac-gray-border bg-bac-gray-alt p-3 text-sm text-gray-700">
            <p className="mb-1 text-xs font-semibold text-gray-900">Resumen ejecutivo</p>
            {resumen}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-700">
            <CheckCircle className="h-4 w-4 text-bac-score-verde" />
            {totalAcciones} accion{totalAcciones !== 1 ? "es" : ""}
          </div>
          {plazoTotal !== null && (
            <div className="flex items-center gap-1.5 text-gray-700">
              <Clock className="h-4 w-4 text-bac-gray-text" />
              Plazo estimado: {plazoTotal} días
            </div>
          )}
        </div>

        {plan.length === 0 ? (
          <p className="text-sm text-bac-gray-text">No se generaron acciones.</p>
        ) : (
          <div className="space-y-2">
            {plan.map((a, i) => (
              <div key={i} className="rounded-lg border border-bac-gray-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{a.accion}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      PRIORIDAD_STYLE[a.prioridad] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {a.prioridad}
                  </span>
                </div>
                <p className="mt-1 text-xs text-bac-gray-text">Origen: {a.brecha_origen}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                  <p><span className="font-medium">Plazo:</span> {a.plazo_dias} días</p>
                  <p><span className="font-medium">Responsable:</span> {a.responsable}</p>
                  <p className="col-span-2"><span className="font-medium">Recursos:</span> {a.recursos}</p>
                  <p className="col-span-2"><span className="font-medium">Indicador:</span> {a.indicador}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
