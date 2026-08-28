"use client";

import { useState } from "react";
import { Trash2, Paperclip, X, Plus, Pencil, FolderOpen, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { FormCampo, campoClass } from "./FormCampo";
import { cn } from "@/lib/utils";
import type { CarpetaItem } from "@/lib/admin/expediente";

export interface FolderDoc {
  id: string;
  nombre_archivo: string;
  url_storage: string;
}

export interface ActividadRatFormState {
  nombre_actividad: string;
  finalidad: string;
  categoria_datos: string;
  categorias_especiales: string;
  categorias_titulares: string;
  perfiles_automatizados: "" | "si" | "no";
  base_licitud: string;
  plazo_conservacion: string;
  destinatarios: string;
  transferencias_internacionales: "" | "si" | "no";
  medidas_seguridad: string;
  departamento: string;
  origen_datos: string;
  articulo_lopdp: string;
  almacenamiento: string;
  activo_informacion: string;
}

export const ACTIVIDAD_RAT_VACIA: ActividadRatFormState = {
  nombre_actividad: "",
  finalidad: "",
  categoria_datos: "",
  categorias_especiales: "",
  categorias_titulares: "",
  perfiles_automatizados: "",
  base_licitud: "",
  plazo_conservacion: "",
  destinatarios: "",
  transferencias_internacionales: "",
  medidas_seguridad: "",
  departamento: "",
  origen_datos: "",
  articulo_lopdp: "",
  almacenamiento: "",
  activo_informacion: "",
};

export const BASES_LICITUD = [
  "Consentimiento",
  "Obligación legal",
  "Orden judicial",
  "Interés público y ejercicio de poderes públicos",
  "Medidas precontractuales y contractuales",
  "Intereses vitales",
  "Datos provenientes de fuentes de acceso público",
  "Interés legítimo",
];

const CAMPOS_OBLIGATORIOS: (keyof ActividadRatFormState)[] = [
  "nombre_actividad",
  "finalidad",
  "categoria_datos",
  "categorias_especiales",
  "categorias_titulares",
  "perfiles_automatizados",
  "base_licitud",
  "plazo_conservacion",
  "destinatarios",
  "transferencias_internacionales",
  "medidas_seguridad",
];

export function validarActividadRat(a: ActividadRatFormState): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (!a[campo] || !a[campo].trim()) errores[campo] = "Obligatorio";
  }
  return errores;
}

export interface BaseLicitudCustom {
  id: string;
  nombre: string;
}

export function ActividadRatFieldset({
  index,
  value,
  onChange,
  onRemove,
  errors,
  archivosAdjuntos,
  onAdjuntarArchivo,
  onQuitarArchivo,
  carpetas,
  docsFromFolder,
  onAdjuntarDesdeCarpeta,
  onQuitarDocCarpeta,
  basesCustom = [],
  onCrearBase,
  onEditarBase,
  onEliminarBase,
}: {
  index: number;
  value: ActividadRatFormState;
  onChange: (v: ActividadRatFormState) => void;
  onRemove: () => void;
  errors: Record<string, string>;
  archivosAdjuntos?: File[];
  onAdjuntarArchivo?: (file: File) => void;
  onQuitarArchivo?: (fileIdx: number) => void;
  carpetas?: CarpetaItem[];
  docsFromFolder?: FolderDoc[];
  onAdjuntarDesdeCarpeta?: (doc: FolderDoc) => void;
  onQuitarDocCarpeta?: (docIdx: number) => void;
  basesCustom?: BaseLicitudCustom[];
  onCrearBase?: (nombre: string) => Promise<void>;
  onEditarBase?: (id: string, nombre: string) => Promise<void>;
  onEliminarBase?: (id: string) => Promise<void>;
}) {
  const [adjuntoTab, setAdjuntoTab] = useState<"local" | "cliente">("local");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  function set<K extends keyof ActividadRatFormState>(key: K, val: ActividadRatFormState[K]) {
    onChange({ ...value, [key]: val });
  }

  function renderFolderPicker(c: CarpetaItem, depth: number): React.ReactNode {
    const indent = 5 + depth * 12;
    const isExpanded = expandedFolders.has(c.id);
    const hasChildren = c.documentos.length > 0 || c.subcarpetas.length > 0;
    const selectedIds = new Set((docsFromFolder ?? []).map((d) => d.id));
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
                onClick={() => onAdjuntarDesdeCarpeta?.(doc)}
                disabled={selectedIds.has(doc.id)}
                className={cn(
                  "mb-0.5 flex items-center gap-1.5 rounded border px-2 py-1 text-left text-xs transition",
                  selectedIds.has(doc.id)
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-bac-gray-border text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                )}
                style={{ marginLeft: `${indent}px`, width: `calc(100% - ${indent}px)` }}
              >
                <FileText className="h-3 w-3 shrink-0 text-blue-400" />
                <span className="truncate">{doc.nombre_archivo}</span>
                {selectedIds.has(doc.id) && <span className="ml-auto text-[10px] text-blue-500">Adjunto</span>}
              </button>
            ))}
            {c.documentos.length === 0 && c.subcarpetas.length === 0 && (
              <p className="text-[10px] text-gray-400" style={{ marginLeft: `${indent}px` }}>Sin documentos</p>
            )}
            {c.subcarpetas.map((sub) => renderFolderPicker(sub, depth + 1))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-bac-gray-border bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Actividad #{index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs font-medium text-bac-score-rojo hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" /> Quitar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormCampo label="Nombre de la actividad" required error={errors.nombre_actividad}>
          <input
            className={campoClass(!!errors.nombre_actividad)}
            value={value.nombre_actividad}
            onChange={(e) => set("nombre_actividad", e.target.value)}
            placeholder="Gestión de Nómina"
          />
        </FormCampo>
        <FormCampo label="Departamento" hint="Opcional">
          <input
            className={campoClass()}
            value={value.departamento}
            onChange={(e) => set("departamento", e.target.value)}
          />
        </FormCampo>
      </div>

      <FormCampo label="Finalidad" required error={errors.finalidad}>
        <textarea
          rows={2}
          className={campoClass(!!errors.finalidad)}
          value={value.finalidad}
          onChange={(e) => set("finalidad", e.target.value)}
        />
      </FormCampo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormCampo
          label="Categoría de Datos"
          required
          error={errors.categoria_datos}
          hint="Separadas por coma (ej. identificativos, financieros)"
        >
          <input
            className={campoClass(!!errors.categoria_datos)}
            value={value.categoria_datos}
            onChange={(e) => set("categoria_datos", e.target.value)}
          />
        </FormCampo>
        <FormCampo
          label="Categorías de Titulares"
          required
          error={errors.categorias_titulares}
          hint="Separadas por coma (ej. clientes, empleados)"
        >
          <input
            className={campoClass(!!errors.categorias_titulares)}
            value={value.categorias_titulares}
            onChange={(e) => set("categorias_titulares", e.target.value)}
          />
        </FormCampo>
      </div>

      <FormCampo
        label="Categorías Especiales de Datos"
        required
        error={errors.categorias_especiales}
        hint="Datos sensibles: salud, biometría, etnia, orientación, etc. Escribe 'Ninguna' si no aplica."
      >
        <input
          className={campoClass(!!errors.categorias_especiales)}
          value={value.categorias_especiales}
          onChange={(e) => set("categorias_especiales", e.target.value)}
        />
      </FormCampo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormCampo label="¿Elaboración de perfiles automatizados?" required error={errors.perfiles_automatizados}>
          <select
            className={campoClass(!!errors.perfiles_automatizados)}
            value={value.perfiles_automatizados}
            onChange={(e) => set("perfiles_automatizados", e.target.value as "si" | "no")}
          >
            <option value="">Selecciona...</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </FormCampo>
        <FormCampo label="Transferencias Internacionales" required error={errors.transferencias_internacionales}>
          <select
            className={campoClass(!!errors.transferencias_internacionales)}
            value={value.transferencias_internacionales}
            onChange={(e) => set("transferencias_internacionales", e.target.value as "si" | "no")}
          >
            <option value="">Selecciona...</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </FormCampo>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BaseLicitudField
          value={value.base_licitud}
          onChange={(v) => set("base_licitud", v)}
          error={errors.base_licitud}
          basesCustom={basesCustom}
          onCrearBase={onCrearBase}
          onEditarBase={onEditarBase}
          onEliminarBase={onEliminarBase}
        />
        <FormCampo label="Artículo LOPDP aplicable" hint="Opcional">
          <input
            className={campoClass()}
            value={value.articulo_lopdp}
            onChange={(e) => set("articulo_lopdp", e.target.value)}
            placeholder="Art. 7"
          />
        </FormCampo>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormCampo label="Plazo de Conservación" required error={errors.plazo_conservacion}>
          <input
            className={campoClass(!!errors.plazo_conservacion)}
            value={value.plazo_conservacion}
            onChange={(e) => set("plazo_conservacion", e.target.value)}
            placeholder="5 años"
          />
        </FormCampo>
        <FormCampo label="Destinatarios" required error={errors.destinatarios}>
          <input
            className={campoClass(!!errors.destinatarios)}
            value={value.destinatarios}
            onChange={(e) => set("destinatarios", e.target.value)}
          />
        </FormCampo>
      </div>

      <FormCampo label="Medidas Técnicas y de Seguridad" required error={errors.medidas_seguridad}>
        <textarea
          rows={2}
          className={campoClass(!!errors.medidas_seguridad)}
          value={value.medidas_seguridad}
          onChange={(e) => set("medidas_seguridad", e.target.value)}
        />
      </FormCampo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormCampo label="Origen de los Datos" hint="Opcional">
          <input
            className={campoClass()}
            value={value.origen_datos}
            onChange={(e) => set("origen_datos", e.target.value)}
          />
        </FormCampo>
        <FormCampo label="Almacenamiento" hint="Opcional">
          <input
            className={campoClass()}
            value={value.almacenamiento}
            onChange={(e) => set("almacenamiento", e.target.value)}
          />
        </FormCampo>
        <FormCampo label="Activo de información relacionado" hint="Opcional">
          <input
            className={campoClass()}
            value={value.activo_informacion}
            onChange={(e) => set("activo_informacion", e.target.value)}
          />
        </FormCampo>
      </div>

      {onAdjuntarArchivo && (
        <div className="border-t border-bac-gray-border pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Documentos adjuntos</span>
          </div>
          {carpetas && carpetas.length > 0 && (
            <div className="flex gap-1 mb-2">
              <button
                type="button"
                onClick={() => setAdjuntoTab("local")}
                className={cn("rounded-md px-2 py-1 text-xs font-medium transition", adjuntoTab === "local" ? "bg-bac-red text-white" : "text-gray-600 hover:bg-gray-100")}
              >
                Archivo local
              </button>
              <button
                type="button"
                onClick={() => setAdjuntoTab("cliente")}
                className={cn("rounded-md px-2 py-1 text-xs font-medium transition", adjuntoTab === "cliente" ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50")}
              >
                Carpetas del cliente
              </button>
            </div>
          )}
          {adjuntoTab === "local" && (
            <label className="inline-flex items-center gap-1 text-xs font-medium text-bac-red hover:underline cursor-pointer mb-2">
              <Paperclip className="h-3.5 w-3.5" /> Adjuntar archivo local
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdjuntarArchivo(f); e.target.value = ""; }} />
            </label>
          )}
          {adjuntoTab === "cliente" && carpetas && carpetas.length > 0 && (
            <div className="rounded-lg border border-blue-200 p-2 bg-blue-50/30 space-y-1 max-h-40 overflow-y-auto mb-2">
              {carpetas.map((c) => renderFolderPicker(c, 0))}
            </div>
          )}
          {((archivosAdjuntos ?? []).length > 0 || (docsFromFolder ?? []).length > 0) && (
            <div className="space-y-1">
              {(archivosAdjuntos ?? []).map((f, fi) => (
                <div key={`local-${fi}`} className="flex items-center justify-between bg-bac-gray-alt rounded px-2 py-1.5 text-xs text-gray-700">
                  <span className="truncate">{f.name}</span>
                  {onQuitarArchivo && (
                    <button type="button" onClick={() => onQuitarArchivo(fi)} className="text-gray-400 hover:text-red-500 ml-2">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {(docsFromFolder ?? []).map((d, di) => (
                <div key={`folder-${di}`} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1.5 text-xs text-blue-700">
                  <div className="flex items-center gap-1 truncate">
                    <FolderOpen className="h-3 w-3 shrink-0 text-blue-400" />
                    <span className="truncate">{d.nombre_archivo}</span>
                  </div>
                  {onQuitarDocCarpeta && (
                    <button type="button" onClick={() => onQuitarDocCarpeta(di)} className="text-blue-400 hover:text-red-500 ml-2">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BaseLicitudField({
  value,
  onChange,
  error,
  basesCustom,
  onCrearBase,
  onEditarBase,
  onEliminarBase,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  basesCustom: BaseLicitudCustom[];
  onCrearBase?: (nombre: string) => Promise<void>;
  onEditarBase?: (id: string, nombre: string) => Promise<void>;
  onEliminarBase?: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const allBases = [...BASES_LICITUD, ...basesCustom.map((b) => b.nombre)];
  const isKnown = allBases.includes(value);

  async function handleCrear() {
    if (!newName.trim() || !onCrearBase) return;
    setSaving(true);
    try {
      await onCrearBase(newName.trim());
      setNewName("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditar(id: string) {
    if (!editName.trim() || !onEditarBase) return;
    setSaving(true);
    try {
      await onEditarBase(id, editName.trim());
      setEditingId(null);
      setEditName("");
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar(id: string) {
    if (!onEliminarBase) return;
    setSaving(true);
    try {
      await onEliminarBase(id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormCampo label="Base de Licitud" required error={error}>
      <select
        className={campoClass(!!error)}
        value={isKnown ? value : value ? "__otro__" : ""}
        onChange={(e) => onChange(e.target.value === "__otro__" ? "" : e.target.value)}
      >
        <option value="">Selecciona...</option>
        {BASES_LICITUD.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
        {basesCustom.length > 0 && (
          <optgroup label="Personalizadas">
            {basesCustom.map((b) => (
              <option key={b.id} value={b.nombre}>{b.nombre}</option>
            ))}
          </optgroup>
        )}
        <option value="__otro__">Otro (especificar)</option>
      </select>

      {!isKnown && (
        <input
          className={`mt-2 ${campoClass(!!error)}`}
          placeholder="Especifica la base de licitud"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {onCrearBase && (
        <div className="mt-2 space-y-1.5">
          {basesCustom.map((b) => (
            <div key={b.id} className="flex items-center gap-1 text-xs">
              {editingId === b.id ? (
                <>
                  <input
                    className="flex-1 px-2 py-1 border border-bac-gray-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-bac-red/30"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEditar(b.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                  />
                  <button type="button" onClick={() => handleEditar(b.id)} disabled={saving} className="text-bac-red hover:text-bac-red-dark px-1">✓</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 px-1">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-gray-600 truncate">{b.nombre}</span>
                  {onEditarBase && (
                    <button type="button" onClick={() => { setEditingId(b.id); setEditName(b.nombre); }} className="text-gray-400 hover:text-bac-red p-0.5" title="Editar">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <button type="button" onClick={() => handleEliminar(b.id)} disabled={saving} className="text-gray-400 hover:text-red-600 p-0.5" title="Eliminar">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}

          {adding ? (
            <div className="flex items-center gap-1">
              <input
                className="flex-1 px-2 py-1 border border-bac-gray-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-bac-red/30"
                placeholder="Nueva base de licitud"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCrear(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                autoFocus
              />
              <button type="button" onClick={handleCrear} disabled={saving || !newName.trim()} className="text-bac-red hover:text-bac-red-dark px-1 text-xs font-medium disabled:opacity-50">✓</button>
              <button type="button" onClick={() => { setAdding(false); setNewName(""); }} className="text-gray-400 hover:text-gray-600 px-1 text-xs">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-bac-red hover:text-bac-red-dark"
            >
              <Plus className="h-3 w-3" /> Agregar opción
            </button>
          )}
        </div>
      )}
    </FormCampo>
  );
}
