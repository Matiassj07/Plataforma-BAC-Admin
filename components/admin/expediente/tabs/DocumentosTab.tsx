"use client";

import React, { useState } from "react";
import {
  Download, Upload, FolderPlus, ChevronDown, ChevronRight,
  Trash2, FolderOpen, FileText, Archive, CheckCircle2, Circle, X, Pencil, RefreshCw, History,
} from "lucide-react";
import { formatearFecha } from "@/lib/utils";
import {
  obtenerUrlDescarga,
  eliminarDocumentoCliente,
  crearCarpetaAdmin,
  eliminarCarpetaAdmin,
  subirDocCarpetaAdmin,
  eliminarDocCarpetaAdmin,
  renombrarDocCarpetaAdmin,
  reemplazarDocCarpeta,
  vincularDocAActividadRat,
  subirDocEnCarpetaClientePorNombre,
} from "@/lib/admin/expediente-actions";
import type { DocumentoItem, CarpetaItem, CarpetaEjemploItem, DocCarpetaItem, PlanImplementacion } from "@/lib/admin/expediente";
import type { ActaEntrega } from "@/lib/admin/acta-entrega-actions";
import { ActaEntregaSection } from "./ActaEntregaSection";
import { useRouter } from "next/navigation";

interface ActividadRatInfo { id: string; index: number; nombre: string; }

export function DocumentosTab({
  clienteId,
  documentos,
  carpetas: initialCarpetas,
  carpetasEjemplo = [],
  actividadesRat = [],
  planes = [],
  acta = null,
  onNavigateToTab,
}: {
  clienteId: string;
  documentos: DocumentoItem[];
  carpetas: CarpetaItem[];
  carpetasEjemplo?: CarpetaEjemploItem[];
  actividadesRat?: ActividadRatInfo[];
  planes?: PlanImplementacion[];
  acta?: ActaEntrega | null;
  onNavigateToTab?: (tab: string, planId?: string) => void;
}) {
  const router = useRouter();
  const [descargando, setDescargando] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [zipping, setZipping] = useState<string | null>(null);
  const [zippingAll, setZippingAll] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; target: string; targetId: string } | null>(null);
  const [pendingMultiUpload, setPendingMultiUpload] = useState<{ files: File[]; carpetaId: string } | null>(null);
  const [multiUploadProgress, setMultiUploadProgress] = useState(0);
  const [showNewSubfolder, setShowNewSubfolder] = useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [selectedRatId, setSelectedRatId] = useState<string>("");
  const [ratDropdownOpen, setRatDropdownOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<{ id: string; nombre: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const replaceFileRef = {} as Record<string, HTMLInputElement | null>;

  function toggleVersionHistory(groupKey: string) {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
      return next;
    });
  }

  function groupDocsByVersion(docs: DocCarpetaItem[]) {
    const groups = new Map<string, DocCarpetaItem[]>();
    for (const doc of docs) {
      const key = doc.doc_original_id ?? doc.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    }
    const result: { latest: DocCarpetaItem; previous: DocCarpetaItem[] }[] = [];
    for (const [, group] of groups) {
      const sorted = group.sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
      result.push({ latest: sorted[0], previous: sorted.slice(1) });
    }
    return result;
  }

  async function handleReplaceDoc(docId: string, file: File) {
    setReplacingDoc(docId);
    try {
      const fd = new FormData();
      fd.set("file", file);
      await reemplazarDocCarpeta(docId, clienteId, fd);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReplacingDoc(null);
    }
  }

  const actMap = new Map<string, ActividadRatInfo>();
  for (const a of actividadesRat) actMap.set(a.id, a);

  function ratLabel(doc: DocCarpetaItem): string | null {
    if (!doc.actividad_rat_id) return null;
    const act = actMap.get(doc.actividad_rat_id);
    if (act) return `#${act.index} — ${act.nombre}`;
    return doc.nombre_actividad_rat ?? null;
  }

  const porSlug = new Map<string, DocumentoItem>();
  for (const d of documentos) {
    if (d.tipo_documento === "rat_actividad") continue;
    const slug = d.slug_requerido || d.tipo_documento;
    if (!slug) continue;
    const actual = porSlug.get(slug);
    if (!actual || (d.fecha_subida ?? "") > (actual.fecha_subida ?? "")) {
      porSlug.set(slug, d);
    }
  }

  async function handleDescargar(doc: DocumentoItem) {
    if (!doc.url_storage) return;
    setDescargando(doc.id);
    try {
      const url = await obtenerUrlDescarga(clienteId, doc.url_storage);
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = doc.nombre_archivo || "documento";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDescargando(null);
    }
  }

  async function handleEliminarDoc(doc: DocumentoItem) {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await eliminarDocumentoCliente(doc.id, clienteId);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDescargarCarpeta(urlStorage: string, nombreArchivo: string) {
    setDescargando(urlStorage);
    try {
      const url = await obtenerUrlDescarga(clienteId, urlStorage);
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDescargando(null);
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await crearCarpetaAdmin(clienteId, newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleCreateSubfolder(carpetaPadreId: string) {
    if (!newSubfolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await crearCarpetaAdmin(clienteId, newSubfolderName.trim(), carpetaPadreId);
      setNewSubfolderName("");
      setShowNewSubfolder(null);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleCreateSubfolderForEjemplo(ejemploNombre: string) {
    if (!newSubfolderName.trim()) return;
    setCreatingFolder(true);
    try {
      let cc = initialCarpetas.find((c) => c.nombre === ejemploNombre);
      let parentId = cc?.id;
      if (!parentId) {
        parentId = await crearCarpetaAdmin(clienteId, ejemploNombre);
      }
      await crearCarpetaAdmin(clienteId, newSubfolderName.trim(), parentId);
      setNewSubfolderName("");
      setShowNewSubfolder(null);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleMultiUploadConfirm() {
    if (!pendingMultiUpload) return;
    const { files, carpetaId } = pendingMultiUpload;
    setUploading(`folder-${carpetaId}`);
    setMultiUploadProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.set("file", files[i]);
        await subirDocCarpetaAdmin(carpetaId, clienteId, formData);
        setMultiUploadProgress(i + 1);
      }
      setPendingMultiUpload(null);
      setMultiUploadProgress(0);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
    }
  }

  async function handleDeleteFolder(carpetaId: string) {
    if (!confirm("¿Eliminar esta carpeta y todos sus documentos?")) return;
    try {
      await eliminarCarpetaAdmin(carpetaId, clienteId);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleFileSelectedForFolder(carpetaId: string, file: File) {
    setPendingUpload({ file, target: "folder", targetId: carpetaId });
    setUploadName(file.name);
  }

  async function handleConfirmUpload() {
    if (!pendingUpload) return;
    const { file, target, targetId } = pendingUpload;
    const key = target === "folder" ? `folder-${targetId}` : `ej-${targetId}`;
    setUploading(key);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (uploadName.trim() && uploadName.trim() !== file.name) {
        formData.set("nombreArchivo", uploadName.trim());
      }
      let docId: string | undefined;
      if (target === "folder") {
        const result = await subirDocCarpetaAdmin(targetId, clienteId, formData);
        docId = result?.docId;
      } else if (target === "template-folder") {
        const result = await subirDocEnCarpetaClientePorNombre(clienteId, targetId, formData);
        docId = result?.docId;
      }
      if (docId && selectedRatId) {
        const act = actividadesRat.find((a) => a.id === selectedRatId);
        if (act) {
          await vincularDocAActividadRat(docId, clienteId, act.id, act.nombre);
        }
      }
      setPendingUpload(null);
      setUploadName("");
      setSelectedRatId("");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
    }
  }

  async function handleRenameDoc() {
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

  async function handleDeleteDoc(docId: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await eliminarDocCarpetaAdmin(docId, clienteId);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function addCarpetaToZip(zipFolder: any, carpeta: CarpetaItem) {
    for (const doc of carpeta.documentos) {
      const url = await obtenerUrlDescarga(clienteId, doc.url_storage);
      const res = await fetch(url);
      const blob = await res.blob();
      zipFolder.file(doc.nombre_archivo, blob);
    }
    for (const sub of carpeta.subcarpetas) {
      const subFolder = zipFolder.folder(sub.nombre)!;
      await addCarpetaToZip(subFolder, sub);
    }
  }

  async function handleZipFolder(carpeta: CarpetaItem) {
    if (countTotalDocs(carpeta) === 0) return;
    setZipping(carpeta.id);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await addCarpetaToZip(zip, carpeta);
      const content = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${carpeta.nombre}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      alert("Error al crear ZIP: " + e.message);
    } finally {
      setZipping(null);
    }
  }

  async function handleZipAll() {
    const ejemploNombresSet = new Set(carpetasEjemplo.map((c) => c.nombre));
    const custom = initialCarpetas.filter((c) => !ejemploNombresSet.has(c.nombre));
    const hasEjemploDocs = carpetasEjemplo.some((ce) => {
      const cc = initialCarpetas.find((c) => c.nombre === ce.nombre);
      const slugDocs = ce.documentos.filter((d) => porSlug.has(d.slug) && porSlug.get(d.slug)!.url_storage);
      return slugDocs.length > 0 || (cc && countTotalDocs(cc) > 0);
    });
    if (!hasEjemploDocs && custom.every((c) => countTotalDocs(c) === 0)) return;
    setZippingAll(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const ce of carpetasEjemplo) {
        const cc = initialCarpetas.find((c) => c.nombre === ce.nombre);
        const slugDocs = ce.documentos
          .map((d) => porSlug.get(d.slug))
          .filter((d): d is DocumentoItem => !!d && !!d.url_storage);
        const extraDocs = cc?.documentos ?? [];
        if (slugDocs.length === 0 && extraDocs.length === 0 && (!cc || cc.subcarpetas.length === 0)) continue;
        const folder = zip.folder(ce.nombre)!;
        for (const doc of slugDocs) {
          const url = await obtenerUrlDescarga(clienteId, doc.url_storage!);
          const res = await fetch(url);
          const blob = await res.blob();
          folder.file(doc.nombre_archivo, blob);
        }
        for (const doc of extraDocs) {
          const url = await obtenerUrlDescarga(clienteId, doc.url_storage);
          const res = await fetch(url);
          const blob = await res.blob();
          folder.file(doc.nombre_archivo, blob);
        }
        if (cc) {
          for (const sub of cc.subcarpetas) {
            const subFolder = folder.folder(sub.nombre)!;
            await addCarpetaToZip(subFolder, sub);
          }
        }
      }
      for (const carpeta of custom) {
        if (countTotalDocs(carpeta) === 0) continue;
        const folder = zip.folder(carpeta.nombre)!;
        await addCarpetaToZip(folder, carpeta);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "documentos_completos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      alert("Error al crear ZIP: " + e.message);
    } finally {
      setZippingAll(false);
    }
  }


  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function countTotalDocs(c: CarpetaItem): number {
    return c.documentos.length + c.subcarpetas.reduce((sum, sub) => sum + countTotalDocs(sub), 0);
  }

  function renderCarpeta(carpeta: CarpetaItem, depth: number): React.ReactNode {
    const isExpanded = expandedFolders.has(carpeta.id);
    const totalDocs = countTotalDocs(carpeta);
    const padLeft = 12 + depth * 16;
    return (
      <div key={carpeta.id} className={`rounded-lg border border-bac-gray-border bg-white overflow-hidden ${depth > 0 ? "ml-4 mt-1" : ""}`}>
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleFolder(carpeta.id)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-bac-gray-text" /> : <ChevronRight className="h-4 w-4 text-bac-gray-text" />}
            <FolderOpen className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-900">{carpeta.nombre}</span>
            <span className="text-[10px] text-bac-gray-text bg-bac-gray-alt px-2 py-0.5 rounded-full">
              {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
              {carpeta.subcarpetas.length > 0 && ` · ${carpeta.subcarpetas.length} subcarpeta${carpeta.subcarpetas.length !== 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <label className="inline-flex items-center gap-1 text-xs text-bac-red hover:text-bac-red-dark cursor-pointer px-2 py-1 rounded hover:bg-bac-red/5">
              <Upload className="h-3 w-3" />
              {uploading === `folder-${carpeta.id}` ? "..." : "Subir"}
              <input
                type="file"
                className="hidden"
                multiple
                disabled={!!uploading}
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  if (files.length === 1) {
                    handleFileSelectedForFolder(carpeta.id, files[0]);
                  } else {
                    setPendingMultiUpload({ files: Array.from(files), carpetaId: carpeta.id });
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => { setShowNewSubfolder(carpeta.id); setNewSubfolderName(""); }}
              className="p-1 text-bac-gray-text hover:text-amber-600 rounded"
              title="Crear subcarpeta"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDeleteFolder(carpeta.id)}
              className="p-1 text-bac-gray-text hover:text-red-600 rounded"
              title="Eliminar carpeta"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-bac-gray-border">
            {showNewSubfolder === carpeta.id && (
              <div className="px-4 py-2 bg-amber-50/50 border-b border-bac-gray-border">
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-1.5 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                    placeholder="Nombre de la subcarpeta"
                    value={newSubfolderName}
                    onChange={(e) => setNewSubfolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateSubfolder(carpeta.id)}
                    autoFocus
                  />
                  <button
                    onClick={() => handleCreateSubfolder(carpeta.id)}
                    disabled={creatingFolder || !newSubfolderName.trim()}
                    className="px-3 py-1.5 text-xs bg-bac-red text-white rounded-lg hover:bg-bac-red-dark disabled:opacity-60"
                  >
                    {creatingFolder ? "..." : "Crear"}
                  </button>
                  <button
                    onClick={() => { setShowNewSubfolder(null); setNewSubfolderName(""); }}
                    className="px-3 py-1.5 text-xs border border-bac-gray-border rounded-lg hover:bg-bac-gray-alt"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {carpeta.documentos.length === 0 && carpeta.subcarpetas.length === 0 ? (
              <p className="px-4 py-3 text-xs text-bac-gray-text">Sin documentos en esta carpeta</p>
            ) : (
              <>
                {carpeta.documentos.length > 0 && (
                  <div className="divide-y divide-bac-gray-border">
                    {groupDocsByVersion(carpeta.documentos).map(({ latest: doc, previous }) => {
                      const isReplacing = replacingDoc === doc.id;
                      const groupKey = doc.doc_original_id ?? doc.id;
                      const isHistoryOpen = expandedVersions.has(groupKey);
                      return (
                        <div key={doc.id}>
                          <div className="flex items-center justify-between px-4 py-2.5" style={{ paddingLeft: padLeft }}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-bac-gray-text" />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-gray-800">{doc.nombre_archivo}</span>
                                  {(doc.version ?? 1) > 1 && (
                                    <span className="text-[9px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">v{doc.version}</span>
                                  )}
                                </div>
                                {doc.nombre_actividad_rat && (
                                  <p className="text-[10px] text-bac-red font-medium">RAT · {doc.nombre_actividad_rat}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {previous.length > 0 && (
                                <button
                                  onClick={() => toggleVersionHistory(groupKey)}
                                  className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50"
                                  title="Ver versiones anteriores"
                                >
                                  <History className="h-3 w-3" />
                                  {previous.length} ant.
                                </button>
                              )}
                              <button
                                onClick={() => setEditingDoc({ id: doc.id, nombre: doc.nombre_archivo })}
                                className="p-1 text-bac-gray-text hover:text-bac-red rounded"
                                title="Renombrar"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDescargarCarpeta(doc.url_storage, doc.nombre_archivo)}
                                disabled={descargando === doc.url_storage}
                                className="inline-flex items-center gap-1 text-xs text-bac-gray-text hover:text-bac-red px-2 py-1 rounded hover:bg-bac-gray-alt"
                              >
                                <Download className="h-3 w-3" />
                                {descargando === doc.url_storage ? "..." : "Descargar"}
                              </button>
                              <label className={`inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer ${isReplacing ? "opacity-50 pointer-events-none" : ""}`}>
                                <RefreshCw className="h-3 w-3" />
                                {isReplacing ? "..." : "Reemplazar"}
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={isReplacing}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleReplaceDoc(doc.id, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-1 text-bac-gray-text hover:text-red-600 rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          {isHistoryOpen && previous.map((prev) => (
                            <div key={prev.id} className="flex items-center justify-between px-4 py-1.5 bg-gray-50" style={{ paddingLeft: padLeft + 16 }}>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{prev.nombre_archivo}</span>
                                <span className="text-[9px] font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">v{prev.version ?? 1}</span>
                              </div>
                              <button
                                onClick={() => handleDescargarCarpeta(prev.url_storage, prev.nombre_archivo)}
                                disabled={descargando === prev.url_storage}
                                className="inline-flex items-center gap-1 text-[10px] text-bac-gray-text hover:text-bac-red px-1.5 py-0.5 rounded hover:bg-bac-gray-alt"
                              >
                                <Download className="h-2.5 w-2.5" />
                                {descargando === prev.url_storage ? "..." : "Descargar"}
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {carpeta.subcarpetas.length > 0 && (
                  <div className="px-2 py-2 space-y-1">
                    {carpeta.subcarpetas.map((sub) => renderCarpeta(sub, depth + 1))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const ejemploNombres = new Set(carpetasEjemplo.map((c) => c.nombre));
  const customCarpetas = initialCarpetas.filter((c) => !ejemploNombres.has(c.nombre));

  return (
    <div className="space-y-6">
      {/* Botón descargar todo */}
      {(initialCarpetas.some((c) => countTotalDocs(c) > 0) || carpetasEjemplo.some((ce) => ce.documentos.some((d) => porSlug.has(d.slug) && porSlug.get(d.slug)!.url_storage))) && (
        <div className="flex justify-end">
          <button
            onClick={handleZipAll}
            disabled={zippingAll}
            className="inline-flex items-center gap-1.5 rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark disabled:opacity-60"
          >
            <Archive className="h-4 w-4" />
            {zippingAll ? "Creando ZIP..." : "Descargar todo en ZIP"}
          </button>
        </div>
      )}

      {/* Carpetas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Carpetas</h3>
          <button
            onClick={() => setShowNewFolder(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-bac-red hover:underline"
          >
            <FolderPlus className="h-3.5 w-3.5" /> Nueva carpeta
          </button>
        </div>

        {showNewFolder && (
          <div className="rounded-lg border border-bac-gray-border bg-white p-3">
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                placeholder="Nombre de la carpeta"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-3 py-2 text-sm bg-bac-red text-white rounded-lg hover:bg-bac-red-dark disabled:opacity-60"
              >
                {creatingFolder ? "..." : "Crear"}
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                className="px-3 py-2 text-sm border border-bac-gray-border rounded-lg hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Carpetas ejemplo */}
        {carpetasEjemplo.map((carpeta) => {
          const isExpanded = expandedFolders.has(`ej-${carpeta.id}`);
          const clientCarpeta = initialCarpetas.find((c) => c.nombre === carpeta.nombre);
          const extraDocs = clientCarpeta?.documentos ?? [];
          const subCarpetas = clientCarpeta?.subcarpetas ?? [];
          const subDocsCount = subCarpetas.reduce((sum, sub) => sum + countTotalDocs(sub), 0);
          const totalCount = carpeta.documentos.length + extraDocs.length + subDocsCount;
          return (
            <div key={`ej-${carpeta.id}`} className="rounded-lg border border-bac-gray-border bg-white overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleFolder(`ej-${carpeta.id}`)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-bac-gray-text" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-bac-gray-text" />
                  )}
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-900">{carpeta.nombre} *</span>
                  <span className="text-[10px] text-bac-gray-text bg-bac-gray-alt px-2 py-0.5 rounded-full">
                    {totalCount} doc{totalCount !== 1 ? "s" : ""}
                    {subCarpetas.length > 0 && ` · ${subCarpetas.length} subcarpeta${subCarpetas.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <label className="inline-flex items-center gap-1 text-xs text-bac-red hover:text-bac-red-dark cursor-pointer px-2 py-1 rounded hover:bg-bac-red/5">
                    <Upload className="h-3 w-3" />
                    {uploading === `ej-${carpeta.id}` ? "..." : "Subir"}
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      disabled={!!uploading}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        if (files.length === 1) {
                          setPendingUpload({ file: files[0], target: "template-folder", targetId: carpeta.nombre });
                          setUploadName(files[0].name);
                        } else if (clientCarpeta) {
                          setPendingMultiUpload({ files: Array.from(files), carpetaId: clientCarpeta.id });
                        } else {
                          setPendingUpload({ file: files[0], target: "template-folder", targetId: carpeta.nombre });
                          setUploadName(files[0].name);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={() => { setShowNewSubfolder(`ej-${carpeta.id}`); setNewSubfolderName(""); }}
                    className="p-1 text-bac-gray-text hover:text-amber-600 rounded"
                    title="Crear subcarpeta"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-bac-gray-border">
                  {showNewSubfolder === `ej-${carpeta.id}` && (
                    <div className="px-4 py-2 bg-amber-50/50 border-b border-bac-gray-border">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-1.5 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
                          placeholder="Nombre de la subcarpeta"
                          value={newSubfolderName}
                          onChange={(e) => setNewSubfolderName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCreateSubfolderForEjemplo(carpeta.nombre)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleCreateSubfolderForEjemplo(carpeta.nombre)}
                          disabled={creatingFolder || !newSubfolderName.trim()}
                          className="px-3 py-1.5 text-xs bg-bac-red text-white rounded-lg hover:bg-bac-red-dark disabled:opacity-60"
                        >
                          {creatingFolder ? "..." : "Crear"}
                        </button>
                        <button
                          onClick={() => { setShowNewSubfolder(null); setNewSubfolderName(""); }}
                          className="px-3 py-1.5 text-xs border border-bac-gray-border rounded-lg hover:bg-bac-gray-alt"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                  {totalCount === 0 && subCarpetas.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-bac-gray-text">Sin documentos en esta carpeta</p>
                  ) : (
                    <div className="divide-y divide-bac-gray-border">
                      {carpeta.documentos.map((doc) => {
                        const clientDoc = porSlug.get(doc.slug);
                        return (
                          <div key={doc.slug} className="flex items-center justify-between px-4 py-2.5 pl-12">
                            <div className="flex items-center gap-2">
                              {clientDoc ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-bac-score-verde flex-shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                              )}
                              <div>
                                <span className="text-sm text-gray-800">{doc.nombre_archivo}</span>
                                {clientDoc && (
                                  <span className="text-[10px] text-bac-score-verde ml-1">✓ Subido por cliente</span>
                                )}
                                {clientDoc?.nombre_actividad_rat && (
                                  <p className="text-[10px] text-bac-red font-medium">RAT · {clientDoc.nombre_actividad_rat}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDescargarCarpeta(doc.url_storage, doc.nombre_archivo)}
                                disabled={descargando === doc.url_storage}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-60"
                              >
                                <FileText className="h-3 w-3" />
                                {descargando === doc.url_storage ? "..." : "Ejemplo"}
                              </button>
                              {clientDoc && (
                                <>
                                  <button
                                    onClick={() => handleDescargar(clientDoc)}
                                    disabled={descargando === clientDoc.id}
                                    className="inline-flex items-center gap-1 text-xs text-bac-gray-text hover:text-bac-red px-2 py-1 border border-bac-gray-border rounded-lg hover:bg-bac-gray-alt disabled:opacity-60"
                                  >
                                    <Download className="h-3 w-3" />
                                    {descargando === clientDoc.id ? "..." : "Descargar"}
                                  </button>
                                  <button
                                    onClick={() => handleEliminarDoc(clientDoc)}
                                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-bac-gray-border rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                              <label className="inline-flex items-center gap-1 text-xs font-medium text-bac-red hover:text-bac-red-dark px-2 py-1 border border-bac-red/20 rounded-lg hover:bg-bac-red/5 cursor-pointer">
                                <Upload className="h-3 w-3" />
                                {clientDoc ? "Reemplazar" : "Subir"}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setPendingUpload({ file, target: "template-folder", targetId: carpeta.nombre });
                                      setUploadName(file.name);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                      {groupDocsByVersion(extraDocs).map(({ latest: doc, previous }) => {
                        const isReplacing = replacingDoc === doc.id;
                        const groupKey = doc.doc_original_id ?? doc.id;
                        const isHistoryOpen = expandedVersions.has(`ej-${groupKey}`);
                        return (
                          <div key={doc.id}>
                            <div className="flex items-center justify-between px-4 py-2.5 pl-12">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-bac-gray-text" />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm text-gray-800">{doc.nombre_archivo}</span>
                                    {(doc.version ?? 1) > 1 && (
                                      <span className="text-[9px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">v{doc.version}</span>
                                    )}
                                  </div>
                                  {ratLabel(doc) && (
                                    <p className="text-[10px] text-bac-red font-medium">RAT · {ratLabel(doc)}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {previous.length > 0 && (
                                  <button
                                    onClick={() => toggleVersionHistory(`ej-${groupKey}`)}
                                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50"
                                    title="Ver versiones anteriores"
                                  >
                                    <History className="h-3 w-3" />
                                    {previous.length} ant.
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingDoc({ id: doc.id, nombre: doc.nombre_archivo })}
                                  className="p-1 text-bac-gray-text hover:text-bac-red rounded"
                                  title="Renombrar"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDescargarCarpeta(doc.url_storage, doc.nombre_archivo)}
                                  disabled={descargando === doc.url_storage}
                                  className="inline-flex items-center gap-1 text-xs text-bac-gray-text hover:text-bac-red px-2 py-1 rounded hover:bg-bac-gray-alt"
                                >
                                  <Download className="h-3 w-3" />
                                  {descargando === doc.url_storage ? "..." : "Descargar"}
                                </button>
                                <label className={`inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer ${isReplacing ? "opacity-50 pointer-events-none" : ""}`}>
                                  <RefreshCw className="h-3 w-3" />
                                  {isReplacing ? "..." : "Reemplazar"}
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={isReplacing}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleReplaceDoc(doc.id, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="p-1 text-bac-gray-text hover:text-red-600 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {isHistoryOpen && previous.map((prev) => (
                              <div key={prev.id} className="flex items-center justify-between px-4 py-1.5 pl-16 bg-gray-50">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{prev.nombre_archivo}</span>
                                  <span className="text-[9px] font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">v{prev.version ?? 1}</span>
                                </div>
                                <button
                                  onClick={() => handleDescargarCarpeta(prev.url_storage, prev.nombre_archivo)}
                                  disabled={descargando === prev.url_storage}
                                  className="inline-flex items-center gap-1 text-[10px] text-bac-gray-text hover:text-bac-red px-1.5 py-0.5 rounded hover:bg-bac-gray-alt"
                                >
                                  <Download className="h-2.5 w-2.5" />
                                  {descargando === prev.url_storage ? "..." : "Descargar"}
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {subCarpetas.length > 0 && (
                    <div className="px-2 py-2 space-y-1">
                      {subCarpetas.map((sub) => renderCarpeta(sub, 1))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Carpetas del cliente */}
        {customCarpetas.length === 0 && carpetasEjemplo.length === 0 && !showNewFolder ? (
          <div className="rounded-lg border border-bac-gray-border bg-white p-6 text-center">
            <FolderOpen className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-bac-gray-text">No hay carpetas creadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customCarpetas.map((carpeta) => renderCarpeta(carpeta, 0))}
          </div>
        )}
      </div>



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
              onKeyDown={(e) => e.key === "Enter" && handleRenameDoc()}
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
                onClick={handleRenameDoc}
                disabled={renaming || !editingDoc.nombre.trim()}
                className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
              >
                {renaming ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setPendingUpload(null); setUploadName(""); setSelectedRatId(""); setRatDropdownOpen(false); }}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Subir documento</h3>
              <button onClick={() => { setPendingUpload(null); setUploadName(""); setSelectedRatId(""); setRatDropdownOpen(false); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-xs text-bac-gray-text">
              Archivo: <span className="font-medium text-gray-700">{pendingUpload.file.name}</span>
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del documento</label>
            <input
              className="w-full px-3 py-2 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
              placeholder="Nombre del documento"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              autoFocus
            />
            {pendingUpload.target !== "ejemplo" && actividadesRat.length > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Asignar a actividad RAT (opcional)</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRatDropdownOpen(!ratDropdownOpen)}
                    className="w-full px-3 py-2 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30 bg-white text-left flex items-center justify-between"
                  >
                    <span className={selectedRatId ? "text-gray-900" : "text-gray-500"}>
                      {selectedRatId
                        ? `#${actividadesRat.find((a) => a.id === selectedRatId)?.index} — ${actividadesRat.find((a) => a.id === selectedRatId)?.nombre}`
                        : "— Sin asignar —"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  </button>
                  {ratDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setRatDropdownOpen(false)} />
                      <ul className="absolute left-0 right-0 top-full mt-1 z-[70] max-h-48 overflow-y-auto rounded-lg border border-bac-gray-border bg-white shadow-lg">
                        <li>
                          <button
                            type="button"
                            onClick={() => { setSelectedRatId(""); setRatDropdownOpen(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-bac-gray-alt ${!selectedRatId ? "bg-bac-red/5 text-bac-red font-medium" : "text-gray-600"}`}
                          >
                            — Sin asignar —
                          </button>
                        </li>
                        {actividadesRat.map((act) => (
                          <li key={act.id}>
                            <button
                              type="button"
                              onClick={() => { setSelectedRatId(act.id); setRatDropdownOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-bac-gray-alt ${selectedRatId === act.id ? "bg-bac-red/5 text-bac-red font-medium" : "text-gray-700"}`}
                            >
                              #{act.index} — {act.nombre}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setPendingUpload(null); setUploadName(""); setSelectedRatId(""); setRatDropdownOpen(false); }}
                className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={!!uploading}
                className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
              >
                {uploading ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingMultiUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!uploading) setPendingMultiUpload(null); }}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Subir {pendingMultiUpload.files.length} archivos</h3>
              <button onClick={() => { if (!uploading) setPendingMultiUpload(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-1 max-h-40 overflow-y-auto mb-3">
              {pendingMultiUpload.files.map((f, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-bac-gray-text shrink-0" />
                  {f.name}
                  {uploading && i < multiUploadProgress && <CheckCircle2 className="h-3 w-3 text-bac-score-verde shrink-0" />}
                </li>
              ))}
            </ul>
            {uploading && (
              <div className="mb-3">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-bac-red rounded-full transition-all" style={{ width: `${(multiUploadProgress / pendingMultiUpload.files.length) * 100}%` }} />
                </div>
                <p className="text-[10px] text-bac-gray-text mt-1">{multiUploadProgress} de {pendingMultiUpload.files.length} subidos</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingMultiUpload(null)}
                disabled={!!uploading}
                className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleMultiUploadConfirm}
                disabled={!!uploading}
                className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
              >
                {uploading ? "Subiendo..." : "Subir todos"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActaEntregaSection clienteId={clienteId} acta={acta} />
    </div>
  );
}
