"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Upload, Trash2, FolderPlus, FolderOpen,
  ChevronDown, ChevronRight, FileText, X, Pencil,
} from "lucide-react";
import {
  obtenerUrlDescargaEjemplo,
  crearCarpetaEjemplo, eliminarCarpetaEjemplo,
  subirDocEnCarpetaEjemplo, eliminarDocDeCarpetaEjemplo, renombrarDocEjemplo,
} from "@/lib/admin/documentos-ejemplo-actions";
import type { DocumentoEjemploItem, CarpetaEjemploItem } from "@/lib/admin/documentos-ejemplo";

export function DocumentosEjemploList({
  documentos: documentosArray,
  carpetas: initialCarpetas,
}: {
  documentos: DocumentoEjemploItem[];
  carpetas: CarpetaEjemploItem[];
}) {
  const router = useRouter();
  const [descargando, setDescargando] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadingFolder, setUploadingFolder] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; carpetaId: string } | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [editingDoc, setEditingDoc] = useState<{ slug: string; nombre: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showNewSubfolder, setShowNewSubfolder] = useState<string | null>(null);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [pendingMultiUpload, setPendingMultiUpload] = useState<{ files: File[]; carpetaId: string } | null>(null);
  const [multiUploadProgress, setMultiUploadProgress] = useState(0);

  async function handleVer(doc: DocumentoEjemploItem) {
    setDescargando(doc.slug);
    try {
      const url = await obtenerUrlDescargaEjemplo(doc.url_storage);
      window.open(url, "_blank");
    } finally {
      setDescargando(null);
    }
  }

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await crearCarpetaEjemplo(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteFolder(carpetaId: string) {
    if (!confirm("¿Eliminar esta carpeta y todos sus documentos de ejemplo?")) return;
    try {
      await eliminarCarpetaEjemplo(carpetaId);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleFileSelectedForFolder(carpetaId: string, file: File) {
    setPendingUpload({ file, carpetaId });
    setUploadName(file.name);
  }

  async function handleConfirmUpload() {
    if (!pendingUpload) return;
    setUploadingFolder(pendingUpload.carpetaId);
    try {
      const formData = new FormData();
      formData.set("file", pendingUpload.file);
      if (uploadName.trim() && uploadName.trim() !== pendingUpload.file.name) {
        formData.set("nombreArchivo", uploadName.trim());
      }
      await subirDocEnCarpetaEjemplo(pendingUpload.carpetaId, formData);
      setPendingUpload(null);
      setUploadName("");
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploadingFolder(null);
    }
  }

  async function handleMultiUploadConfirm() {
    if (!pendingMultiUpload) return;
    const { files, carpetaId } = pendingMultiUpload;
    setUploadingFolder(carpetaId);
    setMultiUploadProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.set("file", files[i]);
        await subirDocEnCarpetaEjemplo(carpetaId, formData);
        setMultiUploadProgress(i + 1);
      }
      setPendingMultiUpload(null);
      setMultiUploadProgress(0);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploadingFolder(null);
    }
  }

  async function handleRenameDoc() {
    if (!editingDoc || !editingDoc.nombre.trim()) return;
    setRenaming(true);
    try {
      await renombrarDocEjemplo(editingDoc.slug, editingDoc.nombre.trim());
      setEditingDoc(null);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRenaming(false);
    }
  }

  async function handleDeleteDocFromFolder(docSlug: string) {
    if (!confirm("¿Eliminar este documento de la carpeta?")) return;
    try {
      await eliminarDocDeCarpetaEjemplo(docSlug);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleCreateSubfolder(parentId: string) {
    if (!newSubfolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await crearCarpetaEjemplo(newSubfolderName.trim(), parentId);
      setNewSubfolderName("");
      setShowNewSubfolder(null);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingFolder(false);
    }
  }

  function countTotalDocs(c: CarpetaEjemploItem): number {
    return c.documentos.length + c.subcarpetas.reduce((sum, sub) => sum + countTotalDocs(sub), 0);
  }

  function renderCarpeta(carpeta: CarpetaEjemploItem, depth: number): React.ReactNode {
    const isExpanded = expandedFolders.has(carpeta.id);
    const totalDocs = countTotalDocs(carpeta);
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
              {uploadingFolder === carpeta.id ? "..." : "Subir"}
              <input
                type="file"
                className="hidden"
                multiple
                disabled={!!uploadingFolder}
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
                    {carpeta.documentos.map((doc) => (
                      <div key={doc.slug} className="flex items-center justify-between px-4 py-2.5 pl-12">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-bac-gray-text" />
                          <span className="text-sm text-gray-800">{doc.nombre_archivo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingDoc({ slug: doc.slug, nombre: doc.nombre_archivo })}
                            className="p-1 text-bac-gray-text hover:text-bac-red rounded"
                            title="Renombrar"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleVer(doc)}
                            disabled={descargando === doc.slug}
                            className="inline-flex items-center gap-1 text-xs text-bac-gray-text hover:text-bac-red px-2 py-1 rounded hover:bg-bac-gray-alt"
                          >
                            <Download className="h-3 w-3" />
                            {descargando === doc.slug ? "..." : "Descargar"}
                          </button>
                          <button
                            onClick={() => handleDeleteDocFromFolder(doc.slug)}
                            className="p-1 text-bac-gray-text hover:text-red-600 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
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

  return (
    <div className="space-y-6">
      {/* Carpetas de ejemplo (visibles para todos los clientes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Carpetas</h3>
            <p className="text-xs text-bac-gray-text">Estas carpetas son visibles para todos los clientes</p>
          </div>
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

        {initialCarpetas.length === 0 && !showNewFolder ? (
          <div className="rounded-lg border border-bac-gray-border bg-white p-6 text-center">
            <FolderOpen className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-bac-gray-text">No hay carpetas creadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {initialCarpetas.map((carpeta) => renderCarpeta(carpeta, 0))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setPendingUpload(null); setUploadName(""); }}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Nombre del documento</h3>
              <button onClick={() => { setPendingUpload(null); setUploadName(""); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 text-xs text-bac-gray-text">
              Archivo: <span className="font-medium text-gray-700">{pendingUpload.file.name}</span>
            </p>
            <input
              className="w-full px-3 py-2 text-sm border border-bac-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-bac-red/30"
              placeholder="Nombre del documento"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmUpload()}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setPendingUpload(null); setUploadName(""); }}
                className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={!!uploadingFolder}
                className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
              >
                {uploadingFolder ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingMultiUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!uploadingFolder) { setPendingMultiUpload(null); setMultiUploadProgress(0); } }}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Subir {pendingMultiUpload.files.length} archivos</h3>
              {!uploadingFolder && (
                <button onClick={() => { setPendingMultiUpload(null); setMultiUploadProgress(0); }} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ul className="mb-3 max-h-40 overflow-y-auto space-y-1">
              {pendingMultiUpload.files.map((f, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-bac-gray-text flex-shrink-0" />
                  {f.name}
                </li>
              ))}
            </ul>
            {uploadingFolder && (
              <div className="mb-3">
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-bac-red rounded-full transition-all" style={{ width: `${(multiUploadProgress / pendingMultiUpload.files.length) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-bac-gray-text text-center">{multiUploadProgress} / {pendingMultiUpload.files.length}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              {!uploadingFolder && (
                <button
                  onClick={() => { setPendingMultiUpload(null); setMultiUploadProgress(0); }}
                  className="rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-bac-gray-alt"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleMultiUploadConfirm}
                disabled={!!uploadingFolder}
                className="rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red/90 disabled:opacity-50"
              >
                {uploadingFolder ? "Subiendo..." : "Subir todos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
