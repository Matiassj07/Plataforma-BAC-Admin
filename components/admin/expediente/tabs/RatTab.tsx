"use client";

import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Plus, Trash2, Paperclip, FolderOpen, X, Pencil, FileText, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { exportarRatXlsx } from "@/lib/export-excel";
import { exportarRatPdf } from "@/lib/export-pdf";
import { COLUMNAS_RAT } from "@/lib/rat-format";
import { formatearFecha, cn } from "@/lib/utils";
import { DateInput } from "@/components/DateInput";
import type { CambiosCampoRat } from "@/lib/admin/expediente";
import { SubirOCrearRatModal } from "./forms/SubirOCrearRatModal";
import { BotonAnalisisIA, ConfirmacionIAModal, ResultadoIABrechasModal } from "./AnalisisIAModal";
import { analizarRatConIA } from "@/lib/admin/ia-actions";
import { actualizarActividadRat, agregarActividadRat, eliminarActividadRat, eliminarVersionRat, subirDocRatEnCarpeta, renombrarDocCarpetaAdmin, eliminarDocCarpetaAdmin, reemplazarDocCarpeta, obtenerBasesLicitudCustom, crearBaseLicitudCustom, editarBaseLicitudCustom, eliminarBaseLicitudCustom, obtenerUrlDescarga } from "@/lib/admin/expediente-actions";
import { BASES_LICITUD, type BaseLicitudCustom } from "./forms/ActividadRatFieldset";
import { crearPlan } from "@/lib/admin/plan-implementacion-actions";
import { EditableCell } from "./EditableCell";
import type { RatVersion, CarpetaEjemploItem, DocActividadRat, CarpetaItem, PlanImplementacion } from "@/lib/admin/expediente";
import { CrearPlanModal } from "./PlanImplementacionTab";

function PlanCell({
  actividadId,
  planes,
  onNavigateToTab,
  onCreatePlan,
}: {
  actividadId: string;
  planes: PlanImplementacion[];
  onNavigateToTab?: (tab: string, planId?: string) => void;
  onCreatePlan: () => void;
}) {
  const vinculados = planes.filter((p) => p.actividad_origen_id === actividadId);

  if (vinculados.length > 0) {
    return (
      <div className="space-y-1">
        {vinculados.map((p) => (
          <button
            key={p.id}
            onClick={() => onNavigateToTab?.("plan", p.id)}
            className="block text-left text-[11px] text-bac-red hover:underline font-medium truncate max-w-[120px]"
            title={p.titulo}
          >
            {p.titulo}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={onCreatePlan}
      className="inline-flex items-center gap-0.5 rounded border border-dashed border-bac-gray-border px-1.5 py-0.5 text-[10px] text-bac-gray-text hover:border-bac-red hover:text-bac-red"
    >
      <Plus className="h-2.5 w-2.5" /> Plan
    </button>
  );
}

function DocCell({
  actividadId,
  actividadNombre,
  clienteId,
  carpetasEjemplo,
  carpetas = [],
  docs,
}: {
  actividadId: string;
  actividadNombre: string;
  clienteId: string;
  carpetasEjemplo: CarpetaEjemploItem[];
  carpetas?: CarpetaItem[];
  docs: DocActividadRat[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"local" | "cliente">("local");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCarpeta, setSelectedCarpeta] = useState("");
  const [docName, setDocName] = useState("");
  const [editingDoc, setEditingDoc] = useState<{ id: string; nombre: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setDocName(file.name);
    setPickerMode("local");
    setShowPicker(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openPickerBrowse() {
    setSelectedFile(null);
    setDocName("");
    setSelectedCarpeta("");
    setPickerMode("local");
    setShowPicker(true);
  }

  async function handleConfirmUpload() {
    if (!selectedFile || !selectedCarpeta) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      if (docName.trim() && docName.trim() !== selectedFile.name) {
        fd.append("nombreArchivo", docName.trim());
      }
      await subirDocRatEnCarpeta(clienteId, actividadId, actividadNombre, selectedCarpeta, fd);
      setShowPicker(false);
      setSelectedFile(null);
      setSelectedCarpeta("");
      setDocName("");
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSelectFromFolder(doc: { id: string; nombre_archivo: string; url_storage: string }, source: "cliente" | "plataforma" = "cliente") {
    setUploading(true);
    try {
      let url: string;
      if (source === "plataforma") {
        const { obtenerUrlDescargaEjemplo } = await import("@/lib/admin/documentos-ejemplo-actions");
        url = await obtenerUrlDescargaEjemplo(doc.url_storage);
      } else {
        url = await obtenerUrlDescarga(clienteId, doc.url_storage);
      }
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], doc.nombre_archivo, { type: blob.type });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("nombreArchivo", doc.nombre_archivo);
      await subirDocRatEnCarpeta(clienteId, actividadId, actividadNombre, selectedCarpeta || carpetas[0]?.nombre || "General", fd);
      setShowPicker(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Error al vincular archivo");
    } finally {
      setUploading(false);
    }
  }

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await reemplazarDocCarpeta(replacingDocId, clienteId, fd);
      setReplacingDocId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Error al reemplazar");
    } finally {
      setUploading(false);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  async function handleRename() {
    if (!editingDoc || !editingDoc.nombre.trim()) return;
    setRenaming(true);
    try {
      await renombrarDocCarpetaAdmin(editingDoc.id, clienteId, editingDoc.nombre.trim());
      setEditingDoc(null);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRenaming(false);
    }
  }

  async function handleDeleteAttached(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await eliminarDocCarpetaAdmin(docId, clienteId);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function renderCarpetaPicker(c: CarpetaItem, depth: number): React.ReactNode {
    const indent = 5 + depth * 12;
    return (
      <div key={c.id}>
        <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1" style={{ marginLeft: `${depth * 12}px` }}>
          <FolderOpen className="h-3.5 w-3.5" /> {c.nombre}
        </p>
        {c.documentos.map((doc) => (
          <button
            key={doc.id}
            onClick={() => handleSelectFromFolder(doc, "cliente")}
            disabled={uploading}
            className="mb-0.5 flex items-center gap-1.5 rounded border border-bac-gray-border px-2 py-1 text-left text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50"
            style={{ marginLeft: `${indent}px`, width: `calc(100% - ${indent}px)` }}
          >
            <FileText className="h-3 w-3 shrink-0 text-blue-400" />
            <span className="truncate">{doc.nombre_archivo}</span>
          </button>
        ))}
        {c.documentos.length === 0 && c.subcarpetas.length === 0 && (
          <p className="text-[10px] text-gray-400" style={{ marginLeft: `${indent}px` }}>Sin documentos</p>
        )}
        {c.subcarpetas.map((sub) => renderCarpetaPicker(sub, depth + 1))}
      </div>
    );
  }

  const grouped = (() => {
    const groups = new Map<string, DocActividadRat[]>();
    for (const d of docs) {
      const key = d.doc_original_id ?? d.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    const result: { latest: DocActividadRat; previous: DocActividadRat[] }[] = [];
    for (const [, group] of groups) {
      const sorted = group.sort((a, b) => ((b.version ?? 1) - (a.version ?? 1)));
      result.push({ latest: sorted[0], previous: sorted.slice(1) });
    }
    return result;
  })();

  return (
    <div className="flex flex-col gap-1">
      <input ref={replaceRef} type="file" className="hidden" onChange={handleReplaceFile} />
      {grouped.map(({ latest: d }) => (
        <div key={d.id} className="flex items-center gap-1 text-[10px]">
          <FileText className="h-3 w-3 text-bac-gray-text shrink-0" />
          <span className="text-gray-700 truncate max-w-[80px]" title={d.nombre_archivo}>{d.nombre_archivo}</span>
          <button
            onClick={() => setEditingDoc({ id: d.id, nombre: d.nombre_archivo })}
            className="p-0.5 text-gray-400 hover:text-bac-red rounded"
            title="Renombrar"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={() => { setReplacingDocId(d.id); replaceRef.current?.click(); }}
            className="p-0.5 text-gray-400 hover:text-blue-600 rounded"
            title="Reemplazar"
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={() => handleDeleteAttached(d.id)}
            className="p-0.5 text-gray-400 hover:text-red-600 rounded"
            title="Eliminar"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
      <button
        onClick={openPickerBrowse}
        className={cn(
          "inline-flex cursor-pointer items-center gap-0.5 rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-500 hover:border-blue-400 hover:text-blue-600",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <Paperclip className="h-3 w-3" />
        {uploading ? "Subiendo..." : "Adjuntar"}
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowPicker(false); setSelectedFile(null); }}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Adjuntar documento</h3>
              <button onClick={() => { setShowPicker(false); setSelectedFile(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-bac-gray-text">
              Actividad: <span className="font-medium text-gray-700">{actividadNombre}</span>
            </p>

            {/* Source tabs */}
            <div className="mb-3 flex gap-1 border-b border-bac-gray-border pb-2">
              <button
                onClick={() => { setPickerMode("local"); setSelectedCarpeta(""); }}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition",
                  pickerMode === "local" ? "bg-bac-red text-white" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                Archivo local
              </button>
              <button
                onClick={() => { setPickerMode("cliente"); setSelectedCarpeta(""); }}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition",
                  pickerMode === "cliente" ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50"
                )}
              >
                Carpetas del cliente
              </button>
            </div>

            {pickerMode === "local" && (
              <>
                {!selectedFile ? (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-bac-red/50">
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-600">Seleccionar archivo</span>
                    <input type="file" className="hidden" onChange={handleFileSelect} />
                  </label>
                ) : (
                  <>
                    <p className="mb-1 text-xs text-bac-gray-text">
                      Archivo: <span className="font-medium text-gray-700">{selectedFile.name}</span>
                    </p>
                    <div className="mb-3">
                      <label className="text-xs font-medium text-bac-gray-text">Nombre del documento</label>
                      <input
                        className="mt-1 w-full px-3 py-2 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                      />
                    </div>
                    <p className="mb-1 text-xs font-medium text-bac-gray-text">Guardar en carpeta del cliente:</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {carpetas.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCarpeta(c.nombre)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                            selectedCarpeta === c.nombre
                              ? "border-bac-red bg-bac-red/5 text-bac-red"
                              : "border-bac-gray-border text-gray-700 hover:bg-bac-gray-alt"
                          )}
                        >
                          <FolderOpen className="h-4 w-4 shrink-0" />
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {pickerMode === "cliente" && (
              <div className="space-y-2 max-h-52 overflow-y-auto rounded-lg border border-blue-200 p-2 bg-blue-50/30">
                {carpetas.length === 0 ? (
                  <p className="text-xs text-bac-gray-text py-4 text-center">No hay carpetas del cliente.</p>
                ) : carpetas.map((c) => renderCarpetaPicker(c, 0))}
              </div>
            )}


            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowPicker(false); setSelectedFile(null); }}
                className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              {pickerMode === "local" && selectedFile && (
                <button
                  onClick={handleConfirmUpload}
                  disabled={!selectedCarpeta || uploading}
                  className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
                >
                  {uploading ? "Subiendo..." : "Subir a carpeta"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingDoc(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Renombrar documento</h3>
              <button onClick={() => setEditingDoc(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              className="w-full px-3 py-2 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
              placeholder="Nombre del documento"
              value={editingDoc.nombre}
              onChange={(e) => setEditingDoc({ ...editingDoc, nombre: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingDoc(null)}
                className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !editingDoc.nombre.trim()}
                className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
              >
                {renaming ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RatTab({
  clienteId,
  nombreEmpresa,
  email,
  versiones,
  carpetasEjemplo = [],
  carpetas = [],
  cambiosCampoRat = [],
  planes = [],
  onNavigateToTab,
}: {
  clienteId: string;
  nombreEmpresa: string;
  email: string;
  versiones: RatVersion[];
  carpetasEjemplo?: CarpetaEjemploItem[];
  carpetas?: CarpetaItem[];
  cambiosCampoRat?: CambiosCampoRat[];
  planes?: PlanImplementacion[];
  onNavigateToTab?: (tab: string, planId?: string) => void;
}) {
  const router = useRouter();
  const [mostrarSubir, setMostrarSubir] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mostrarConfirmIA, setMostrarConfirmIA] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<{
    brechas: any[];
    resumen: string;
    score: number | null;
    costo: string;
  } | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [crearPlanParaActividad, setCrearPlanParaActividad] = useState<{ id: string; nombre: string } | null>(null);
  const [mostrarAgregarActividad, setMostrarAgregarActividad] = useState(false);
  const actual = versiones[0];

  const actividadesParaPlan = actual
    ? actual.actividades.map((a, i) => ({ id: a.id, index: i + 1, nombre: a.nombre_actividad ?? `Actividad ${i + 1}` }))
    : [];

  function getCambiosParaCelda(actividadId: string, campo: string) {
    return cambiosCampoRat
      .filter((c) => c.actividad_rat_id === actividadId && c.campo === campo)
      .sort((a, b) => a.version_cambio - b.version_cambio);
  }

  async function handleConfirmarIA() {
    if (!actual) return;
    setAnalizandoIA(true);
    setErrorIA(null);
    try {
      const res = await analizarRatConIA(clienteId, actual.id);
      setMostrarConfirmIA(false);
      setResultadoIA(res);
    } catch (e: any) {
      setMostrarConfirmIA(false);
      setErrorIA(e.message ?? "Error al analizar con IA");
    } finally {
      setAnalizandoIA(false);
    }
  }

  function handleDescargar(tipo: "excel" | "pdf") {
    if (!actual) return;
    const params = {
      nombreEmpresa,
      version: actual.version,
      responsable: {
        nombre: actual.datos_responsable?.responsable,
        ruc: actual.datos_responsable?.ruc,
        direccion: actual.datos_responsable?.direccion,
        encargado: actual.datos_responsable?.encargado,
      },
      dpd: {
        nombre: actual.datos_dpd?.nombre,
        direccion: actual.datos_dpd?.direccion,
        correo: actual.datos_dpd?.correo ?? actual.datos_responsable?.email ?? email,
      },
      actividades: actual.actividades,
    };
    startTransition(() => {
      if (tipo === "excel") exportarRatXlsx(params);
      else exportarRatPdf(params);
    });
  }

  async function handleSaveCell(actividadId: string, campo: string, valor: unknown) {
    await actualizarActividadRat(actividadId, clienteId, campo, valor);
    router.refresh();
  }

  async function handleAgregar(datos: Record<string, string>) {
    if (!actual) return;
    const newId = await agregarActividadRat(actual.id, clienteId, datos);
    setMostrarAgregarActividad(false);
    router.refresh();
    return newId;
  }

  async function handleEliminar(actividadId: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await eliminarActividadRat(actividadId, clienteId);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {actual && (
            <BotonAnalisisIA tipo="rat" onClick={() => setMostrarConfirmIA(true)} />
          )}
          <button
            onClick={() => setMostrarSubir(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
          >
            <Upload className="h-3.5 w-3.5" /> Subir RAT
          </button>
          {actual && (
            <>
              <button
                onClick={() => handleDescargar("pdf")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                onClick={() => handleDescargar("excel")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" /> Excel
              </button>
              <button
                onClick={async () => {
                  if (!confirm("¿Eliminar todo el RAT? Esta acción no se puede deshacer.")) return;
                  try {
                    await eliminarVersionRat(actual.id, clienteId);
                    router.refresh();
                  } catch (err: any) {
                    alert(err.message ?? "Error al eliminar el RAT.");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar RAT completo
              </button>
            </>
          )}
        </div>
      </div>

      {!actual ? (
        <p className="text-sm text-bac-gray-text">Este cliente aún no tiene versiones del RAT.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-bac-gray-border">
            <div className="bg-bac-red px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
              Registro de Actividades de Tratamiento (RAT) — {nombreEmpresa}
            </div>
            <div className="grid grid-cols-1 divide-y divide-bac-gray-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-gray-700">Responsable de Tratamiento</p>
                <p className="text-gray-800">{actual.datos_responsable?.responsable ?? nombreEmpresa}</p>
                <p className="text-bac-gray-text">RUC: {actual.datos_responsable?.ruc ?? "—"}</p>
                <p className="text-bac-gray-text">
                  Dirección: {actual.datos_responsable?.direccion ?? "—"}
                </p>
                <p className="text-bac-gray-text">
                  Encargado de Tratamiento: {actual.datos_responsable?.encargado ?? "—"}
                </p>
              </div>
              <div className="p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  Delegado de Protección de Datos (DPD)
                </p>
                <p className="text-gray-800">Nombre: {actual.datos_dpd?.nombre ?? "—"}</p>
                <p className="text-bac-gray-text">Dirección: {actual.datos_dpd?.direccion ?? "—"}</p>
                <p className="text-bac-gray-text">
                  Correo: {actual.datos_dpd?.correo ?? actual.datos_responsable?.email ?? email}
                </p>
              </div>
            </div>
          </div>

          {actual.actividades.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-bac-gray-text">Esta versión no tiene actividades registradas.</p>
              <button
                onClick={() => setMostrarAgregarActividad(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir actividad
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto rounded-xl border border-bac-gray-border bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-bac-red text-xs font-semibold uppercase tracking-wide text-white">
                      {COLUMNAS_RAT.map((c) => (
                        <th key={c.key} className="whitespace-nowrap px-3 py-2">
                          {c.label}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-2">Plan</th>
                      <th className="whitespace-nowrap px-3 py-2">Doc</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {actual.actividades.map((a, i) => (
                      <tr key={a.id} className="border-b border-bac-gray-border last:border-0 even:bg-blue-50/40">
                        {COLUMNAS_RAT.map((c) => (
                          <td key={c.key} className="whitespace-pre-line px-3 py-1 text-gray-700" style={{ minWidth: "120px" }}>
                            <EditableCell
                              value={a[c.key]}
                              field={c.key}
                              onSave={(campo, valor) => handleSaveCell(a.id, campo, valor)}
                              cambios={getCambiosParaCelda(a.id, c.key)}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1" style={{ minWidth: "100px" }}>
                          <PlanCell
                            actividadId={a.id}
                            planes={planes}
                            onNavigateToTab={onNavigateToTab}
                            onCreatePlan={() => setCrearPlanParaActividad({ id: a.id, nombre: a.nombre_actividad ?? `Actividad ${i + 1}` })}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: "130px" }}>
                          <DocCell
                            actividadId={a.id}
                            actividadNombre={`#${i + 1} — ${a.nombre_actividad ?? `Actividad ${i + 1}`}`}
                            clienteId={clienteId}
                            carpetasEjemplo={carpetasEjemplo}
                            carpetas={carpetas}
                            docs={actual.docsActividades.filter((d) => d.actividad_rat_id === a.id)}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => handleEliminar(a.id)}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setMostrarAgregarActividad(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-bac-gray-border px-3 py-1.5 text-xs font-medium text-bac-gray-text hover:border-bac-red hover:text-bac-red"
              >
                <Plus className="h-3.5 w-3.5" /> Añadir actividad
              </button>
            </div>
          )}
        </>
      )}

      {errorIA && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorIA}
        </div>
      )}

      {mostrarConfirmIA && (
        <ConfirmacionIAModal
          tipo="rat"
          analizando={analizandoIA}
          onConfirmar={handleConfirmarIA}
          onClose={() => { if (!analizandoIA) setMostrarConfirmIA(false); }}
        />
      )}

      {resultadoIA && (
        <ResultadoIABrechasModal
          brechas={resultadoIA.brechas}
          resumen={resultadoIA.resumen}
          score={resultadoIA.score}
          onClose={() => setResultadoIA(null)}
        />
      )}

      {mostrarSubir && (
        <SubirOCrearRatModal
          clienteId={clienteId}
          nombreEmpresa={nombreEmpresa}
          carpetas={carpetas}
          onClose={() => setMostrarSubir(false)}
          onCreado={() => setMostrarSubir(false)}
        />
      )}

      {crearPlanParaActividad && (
        <CrearPlanModal
          tipo="rat"
          clienteId={clienteId}
          actividades={actividadesParaPlan}
          preselectedActivityId={crearPlanParaActividad.id}
          onClose={() => setCrearPlanParaActividad(null)}
        />
      )}

      {mostrarAgregarActividad && (
        <AgregarActividadRatModal
          clienteId={clienteId}
          carpetas={carpetas}
          onConfirm={handleAgregar}
          onClose={() => setMostrarAgregarActividad(false)}
        />
      )}
    </div>
  );
}

export function AgregarActividadRatModal({
  clienteId,
  carpetas = [],
  onConfirm,
  onClose,
}: {
  clienteId?: string;
  carpetas?: CarpetaItem[];
  onConfirm: (datos: Record<string, string>) => Promise<string | void>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [planEnabled, setPlanEnabled] = useState(false);
  const [plan, setPlan] = useState({ titulo: "", responsable: "", departamento: "", actividad_nombre: "", actividad_realizar: "", fecha_inicio: "", fecha_fin: "" });
  const [adjuntoMode, setAdjuntoMode] = useState<"none" | "local" | "cliente">("none");
  const [adjuntoFile, setAdjuntoFile] = useState<File | null>(null);
  const [adjuntoDocName, setAdjuntoDocName] = useState("");
  const [adjuntoCarpeta, setAdjuntoCarpeta] = useState("");
  const [adjuntoFromFolder, setAdjuntoFromFolder] = useState<{ id: string; nombre_archivo: string; url_storage: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    departamento: "",
    nombre_actividad: "",
    finalidad: "",
    categoria_datos: "",
    categorias_especiales: "",
    categorias_titulares: "",
    origen_datos: "",
    base_licitud: "",
    articulo_lopdp: "",
    almacenamiento: "",
    plazo_conservacion: "",
    destinatarios: "",
    transferencias_internacionales: "",
    medidas_seguridad: "",
    activo_informacion: "",
  });

  const camposObligatorios = [
    { key: "nombre_actividad", label: "Actividad de Tratamiento", required: true },
    { key: "departamento", label: "Departamento", required: true },
    { key: "finalidad", label: "Finalidad", required: true },
    { key: "categoria_datos", label: "Categoría de Datos", required: true },
    { key: "base_licitud", label: "Base de Licitud", required: true },
  ];

  const camposOpcionales = [
    { key: "categorias_especiales", label: "Categorías Especiales de Datos" },
    { key: "categorias_titulares", label: "Categorías de Titulares" },
    { key: "origen_datos", label: "Origen de los Datos" },
    { key: "articulo_lopdp", label: "Artículo LOPDP" },
    { key: "almacenamiento", label: "Almacenamiento" },
    { key: "plazo_conservacion", label: "Plazo de Conservación" },
    { key: "destinatarios", label: "Destinatarios" },
    { key: "transferencias_internacionales", label: "Transferencias Internacionales de Datos" },
    { key: "medidas_seguridad", label: "Medidas Técnicas y Organizativas de Seguridad" },
    { key: "activo_informacion", label: "Activo de Información" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_actividad.trim()) return;
    setSaving(true);
    try {
      const newId = await onConfirm(form);
      if (planEnabled && plan.titulo.trim() && newId && clienteId) {
        await crearPlan(clienteId, {
          tipo: "rat",
          actividad_origen_id: newId,
          titulo: plan.titulo,
          responsable: plan.responsable || undefined,
          departamento: plan.departamento || undefined,
          actividad_nombre: plan.actividad_nombre || undefined,
          actividad_realizar: plan.actividad_realizar || undefined,
          fecha_inicio: plan.fecha_inicio || undefined,
          fecha_fin: plan.fecha_fin || undefined,
        });
      }
      if (newId && clienteId) {
        const targetCarpeta = adjuntoCarpeta || carpetas[0]?.nombre || "General";
        if (adjuntoFile) {
          const fd = new FormData();
          fd.append("file", adjuntoFile);
          if (adjuntoDocName.trim() && adjuntoDocName.trim() !== adjuntoFile.name) {
            fd.append("nombreArchivo", adjuntoDocName.trim());
          }
          await subirDocRatEnCarpeta(clienteId, newId, form.nombre_actividad, targetCarpeta, fd);
        } else if (adjuntoFromFolder) {
          const url = await obtenerUrlDescarga(clienteId, adjuntoFromFolder.url_storage);
          const resp = await fetch(url);
          const blob = await resp.blob();
          const file = new File([blob], adjuntoFromFolder.nombre_archivo, { type: blob.type });
          const fd = new FormData();
          fd.append("file", file);
          fd.append("nombreArchivo", adjuntoFromFolder.nombre_archivo);
          await subirDocRatEnCarpeta(clienteId, newId, form.nombre_actividad, targetCarpeta, fd);
        }
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message ?? "Error al crear actividad");
    } finally {
      setSaving(false);
    }
  }

  function renderModalCarpetaPicker(c: CarpetaItem, depth: number): React.ReactNode {
    const indent = 5 + depth * 12;
    const isExpanded = expandedFolders.has(c.id);
    const hasChildren = c.documentos.length > 0 || c.subcarpetas.length > 0;
    return (
      <div key={c.id}>
        <button
          type="button"
          className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1 hover:text-blue-900"
          style={{ marginLeft: `${depth * 12}px` }}
          onClick={() => {
            const next = new Set(expandedFolders);
            if (isExpanded) next.delete(c.id); else next.add(c.id);
            setExpandedFolders(next);
          }}
        >
          {hasChildren ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="w-3" />}
          <FolderOpen className="h-3.5 w-3.5" /> {c.nombre}
        </button>
        {isExpanded && (
          <>
            {c.documentos.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setAdjuntoFromFolder(doc);
                  setAdjuntoFile(null);
                  setAdjuntoDocName(doc.nombre_archivo);
                }}
                className={cn(
                  "mb-0.5 flex items-center gap-1.5 rounded border px-2 py-1 text-left text-xs transition",
                  adjuntoFromFolder?.id === doc.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-bac-gray-border text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                )}
                style={{ marginLeft: `${indent}px`, width: `calc(100% - ${indent}px)` }}
              >
                <FileText className="h-3 w-3 shrink-0 text-blue-400" />
                <span className="truncate">{doc.nombre_archivo}</span>
              </button>
            ))}
            {c.documentos.length === 0 && c.subcarpetas.length === 0 && (
              <p className="text-[10px] text-gray-400" style={{ marginLeft: `${indent}px` }}>Sin documentos</p>
            )}
            {c.subcarpetas.map((sub) => renderModalCarpetaPicker(sub, depth + 1))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Nueva actividad RAT</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-bac-gray-text">
          Complete los campos obligatorios y opcionalmente los adicionales. La actividad se añadirá al final de la tabla.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bac-red">Campos obligatorios</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {camposObligatorios.map((c) => (
                <div key={c.key} className={c.key === "nombre_actividad" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    {c.label} <span className="text-red-500">*</span>
                  </label>
                  {c.key === "base_licitud" ? (
                    <select
                      className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30 bg-white"
                      value={BASES_LICITUD.includes(form.base_licitud) ? form.base_licitud : form.base_licitud ? "__otro__" : ""}
                      onChange={(e) => setForm((p) => ({ ...p, base_licitud: e.target.value === "__otro__" ? "" : e.target.value }))}
                      required
                    >
                      <option value="">Selecciona...</option>
                      {BASES_LICITUD.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__otro__">Otro (especificar)</option>
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                      value={form[c.key as keyof typeof form]}
                      onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))}
                      placeholder={c.label}
                      required
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Campos opcionales</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {camposOpcionales.map((c) => (
                <div key={c.key}>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{c.label}</label>
                  <input
                    className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                    value={form[c.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [c.key]: e.target.value }))}
                    placeholder={c.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-bac-gray-border pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Adjuntar documento (opcional)</h4>
            <div className="flex gap-1 mb-2">
              <button type="button" onClick={() => { setAdjuntoMode("none"); setAdjuntoFile(null); setAdjuntoFromFolder(null); setAdjuntoDocName(""); setAdjuntoCarpeta(""); }}
                className={cn("rounded-md px-2 py-1 text-xs font-medium transition", adjuntoMode === "none" ? "bg-bac-red text-white" : "text-gray-600 hover:bg-gray-100")}>
                Sin adjunto
              </button>
              <button type="button" onClick={() => { setAdjuntoMode("local"); setAdjuntoFile(null); setAdjuntoFromFolder(null); setAdjuntoDocName(""); setAdjuntoCarpeta(""); }}
                className={cn("rounded-md px-2 py-1 text-xs font-medium transition", adjuntoMode === "local" ? "bg-bac-red text-white" : "text-gray-600 hover:bg-gray-100")}>
                Archivo local
              </button>
              <button type="button" onClick={() => { setAdjuntoMode("cliente"); setAdjuntoFile(null); setAdjuntoFromFolder(null); setAdjuntoDocName(""); setAdjuntoCarpeta(""); }}
                className={cn("rounded-md px-2 py-1 text-xs font-medium transition", adjuntoMode === "cliente" ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50")}>
                Carpetas del cliente
              </button>
            </div>
            {adjuntoMode === "local" && (
              <div className="rounded-lg border border-bac-gray-border p-3 bg-gray-50 space-y-2">
                {!adjuntoFile ? (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-bac-red/50">
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-xs text-gray-600">Seleccionar archivo</span>
                    <input type="file" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setAdjuntoFile(file); setAdjuntoDocName(file.name); setAdjuntoFromFolder(null); }
                      e.target.value = "";
                    }} />
                  </label>
                ) : (
                  <>
                    <p className="text-xs text-bac-gray-text">Archivo: <span className="font-medium text-gray-700">{adjuntoFile.name}</span>
                      <button type="button" onClick={() => { setAdjuntoFile(null); setAdjuntoDocName(""); }} className="ml-2 text-red-500 hover:text-red-700 text-[10px]">Quitar</button>
                    </p>
                    <div>
                      <label className="text-xs font-medium text-bac-gray-text">Nombre del documento</label>
                      <input className="mt-1 w-full px-3 py-1.5 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={adjuntoDocName} onChange={(e) => setAdjuntoDocName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-bac-gray-text">Guardar en carpeta:</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {carpetas.map((c) => (
                          <button key={c.id} type="button" onClick={() => setAdjuntoCarpeta(c.nombre)}
                            className={cn("rounded border px-2 py-1 text-xs transition", adjuntoCarpeta === c.nombre ? "border-bac-red bg-bac-red/5 text-bac-red" : "border-bac-gray-border text-gray-700 hover:bg-gray-100")}>
                            {c.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {adjuntoMode === "cliente" && (
              <div className="rounded-lg border border-blue-200 p-3 bg-blue-50/30 space-y-1 max-h-48 overflow-y-auto">
                {carpetas.length === 0 ? (
                  <p className="text-xs text-bac-gray-text py-2 text-center">No hay carpetas del cliente.</p>
                ) : carpetas.map((c) => renderModalCarpetaPicker(c, 0))}
                {adjuntoFromFolder && (
                  <p className="mt-2 text-xs text-blue-700 font-medium border-t border-blue-200 pt-2">
                    Seleccionado: {adjuntoFromFolder.nombre_archivo}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-bac-gray-border pt-4">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={planEnabled} onChange={(e) => setPlanEnabled(e.target.checked)} className="rounded border-gray-300" />
              Crear plan de implementación para esta actividad
            </label>
            {planEnabled && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-lg border border-bac-gray-border p-3 bg-gray-50">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Título del plan <span className="text-red-500">*</span></label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.titulo} onChange={(e) => setPlan((p) => ({ ...p, titulo: e.target.value }))} placeholder="Título del plan" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Responsable</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.responsable} onChange={(e) => setPlan((p) => ({ ...p, responsable: e.target.value }))} placeholder="Responsable" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Departamento</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.departamento} onChange={(e) => setPlan((p) => ({ ...p, departamento: e.target.value }))} placeholder="Departamento" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Actividad a realizar</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.actividad_realizar} onChange={(e) => setPlan((p) => ({ ...p, actividad_realizar: e.target.value }))} placeholder="Actividad a realizar" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Nombre de actividad</label>
                  <input className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.actividad_nombre} onChange={(e) => setPlan((p) => ({ ...p, actividad_nombre: e.target.value }))} placeholder="Nombre de actividad" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Fecha inicio</label>
                  <DateInput className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.fecha_inicio} onChange={(v) => setPlan((p) => ({ ...p, fecha_inicio: v }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Fecha fin</label>
                  <DateInput className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red/30" value={plan.fecha_fin} onChange={(v) => setPlan((p) => ({ ...p, fecha_fin: v }))} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-bac-gray-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-bac-gray-border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.nombre_actividad.trim() || (planEnabled && !plan.titulo.trim())}
              className="rounded-lg bg-bac-red px-4 py-2 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
