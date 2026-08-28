"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { Send, AlertCircle, Check, X, Paperclip, Search, Users, Eye, ChevronDown } from "lucide-react";
import { enviarCorreoCompleto } from "@/lib/admin/correos-actions";
import sanitizeHtml from "sanitize-html";
import { RichTextEditor } from "@/components/admin/shared/RichTextEditor";
import type { PlantillaCorreo, ClienteCorreo } from "@/lib/admin/correos";

export function CorreosEnvioTab({
  plantillas,
  clientes,
}: {
  plantillas: PlantillaCorreo[];
  clientes: ClienteCorreo[];
}) {
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  const [emailsExtra, setEmailsExtra] = useState("");
  const [adjuntos, setAdjuntos] = useState<{ name: string; file: File }[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ enviados: number; errores: number; total: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const clientesFiltrados = useMemo(() => clientes.filter((c) =>
    !busqueda || c.nombre_empresa.toLowerCase().includes(busqueda.toLowerCase()) || c.email.toLowerCase().includes(busqueda.toLowerCase())
  ), [clientes, busqueda]);

  function toggleCliente(id: string) {
    setSelectedClientes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodos() {
    if (selectedClientes.size === clientes.length) {
      setSelectedClientes(new Set());
    } else {
      setSelectedClientes(new Set(clientes.map((c) => c.id)));
    }
  }

  function cargarPlantilla(plantillaId: string) {
    const p = plantillas.find((pl) => pl.id === plantillaId);
    if (p) {
      setAsunto(p.asunto);
      setCuerpo(p.cuerpo);
    }
  }

  function handleAttach(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo no puede superar los 10 MB.");
      return;
    }
    setAdjuntos((prev) => [...prev, { name: file.name, file }]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        handleAttach(files[i]);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeAdjunto(idx: number) {
    setAdjuntos((prev) => prev.filter((_, i) => i !== idx));
  }

  function getDestinatarios(): { email: string; id: string | null }[] {
    const dest: { email: string; id: string | null }[] = [];
    for (const id of selectedClientes) {
      const c = clientes.find((cl) => cl.id === id);
      if (c) dest.push({ email: c.email, id: c.id });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const extras = emailsExtra.split(",").map((e) => e.trim()).filter(Boolean);
    for (const email of extras) {
      if (!emailRe.test(email)) continue;
      if (!dest.some((d) => d.email === email)) {
        dest.push({ email, id: null });
      }
    }
    return dest;
  }

  function enviar() {
    setError(null);
    setResultado(null);

    if (!asunto.trim()) { setError("El asunto es obligatorio."); return; }
    if (!cuerpo.trim()) { setError("El cuerpo del correo es obligatorio."); return; }

    const destinatarios = getDestinatarios();
    if (destinatarios.length === 0) { setError("Selecciona al menos un destinatario."); return; }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("asunto", asunto.trim());
        fd.set("cuerpo", cuerpo);
        fd.set("destinatarios", JSON.stringify(destinatarios));
        for (const adj of adjuntos) {
          fd.append("adjuntos", adj.file);
        }
        const res = await enviarCorreoCompleto(fd);
        setResultado(res);
        if (res.errores === 0) {
          setAsunto("");
          setCuerpo("");
          setSelectedClientes(new Set());
          setEmailsExtra("");
          setAdjuntos([]);
          setMostrarPreview(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar.");
      }
    });
  }

  const destinatarios = getDestinatarios();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Cargar desde plantilla */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Cargar plantilla (opcional)</label>
        <select
          onChange={(e) => { if (e.target.value) cargarPlantilla(e.target.value); }}
          className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
          defaultValue=""
        >
          <option value="">Escribir desde cero...</option>
          {plantillas.map((p) => (
            <option key={p.id} value={p.id}>{p.asunto}</option>
          ))}
        </select>
      </div>

      {/* Destinatarios */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Destinatarios</label>

        {/* Clientes seleccionados como chips */}
        {selectedClientes.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Array.from(selectedClientes).map((id) => {
              const c = clientes.find((cl) => cl.id === id);
              if (!c) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-bac-red/10 px-2.5 py-1 text-xs font-medium text-bac-red"
                >
                  {c.nombre_empresa}
                  <button onClick={() => toggleCliente(id)} className="hover:text-red-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Selector de clientes */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMostrarClientes(!mostrarClientes)}
            className="w-full flex items-center justify-between rounded-lg border border-bac-gray-border px-3 py-2 text-sm text-left hover:bg-gray-50"
          >
            <span className="flex items-center gap-2 text-bac-gray-text">
              <Users className="h-4 w-4" />
              {selectedClientes.size === 0
                ? "Seleccionar clientes..."
                : `${selectedClientes.size} cliente${selectedClientes.size > 1 ? "s" : ""} seleccionado${selectedClientes.size > 1 ? "s" : ""}`}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition ${mostrarClientes ? "rotate-180" : ""}`} />
          </button>

          {mostrarClientes && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-bac-gray-border bg-white shadow-lg">
              <div className="p-2 border-b border-bac-gray-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full rounded border border-bac-gray-border pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-bac-red"
                  />
                </div>
              </div>
              <div className="p-1 border-b border-bac-gray-border">
                <button
                  type="button"
                  onClick={seleccionarTodos}
                  className="w-full text-left px-3 py-1.5 text-xs font-medium text-bac-red hover:bg-gray-50 rounded"
                >
                  {selectedClientes.size === clientes.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {clientesFiltrados.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-bac-gray-text">No se encontraron clientes.</p>
                ) : (
                  clientesFiltrados.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedClientes.has(c.id)}
                        onChange={() => toggleCliente(c.id)}
                        className="rounded border-bac-gray-border text-bac-red focus:ring-bac-red"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-gray-900 truncate">{c.nombre_empresa}</span>
                        <span className="block text-[10px] text-bac-gray-text truncate">{c.email}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-bac-gray-border">
                <button
                  type="button"
                  onClick={() => { setMostrarClientes(false); setBusqueda(""); }}
                  className="w-full rounded-lg bg-bac-red px-3 py-1.5 text-xs font-medium text-white hover:bg-bac-red-dark"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Emails extra manuales */}
        <input
          type="text"
          value={emailsExtra}
          onChange={(e) => setEmailsExtra(e.target.value)}
          placeholder="Emails adicionales separados por coma..."
          className="mt-2 w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
        />
      </div>

      {/* Asunto */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Asunto</label>
        <input
          type="text"
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Asunto del correo..."
          className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bac-red"
        />
      </div>

      {/* Cuerpo con editor enriquecido */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">Mensaje</label>
        <RichTextEditor
          value={cuerpo}
          onChange={setCuerpo}
          onAttach={handleAttach}
          attachments={adjuntos.map((a) => ({ name: a.name }))}
          placeholder="Escribe tu mensaje..."
          minHeight="180px"
        />
      </div>

      {/* Adjuntos extra */}
      {adjuntos.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">Archivos adjuntos ({adjuntos.length}):</p>
          {adjuntos.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-bac-gray-border px-3 py-1.5 text-xs">
              <Paperclip className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="truncate flex-1 text-gray-700">{a.name}</span>
              <span className="text-bac-gray-text shrink-0">{(a.file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeAdjunto(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-bac-gray-border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt"
        >
          <Paperclip className="h-4 w-4" /> Adjuntar archivo
        </button>
        <input ref={fileRef} type="file" multiple onChange={handleFileInput} className="hidden" />
      </div>

      {/* Errores y resultados */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-bac-score-rojo">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {resultado && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${resultado.errores === 0 ? "bg-green-50 text-bac-score-verde" : "bg-yellow-50 text-yellow-700"}`}>
          <Check className="h-4 w-4 shrink-0" />
          {resultado.errores === 0
            ? `${resultado.enviados} correo${resultado.enviados > 1 ? "s" : ""} enviado${resultado.enviados > 1 ? "s" : ""} exitosamente.`
            : `${resultado.enviados} enviado${resultado.enviados > 1 ? "s" : ""}, ${resultado.errores} con error.`}
        </div>
      )}

      {/* Preview y enviar */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setMostrarPreview(!mostrarPreview)}
          disabled={!asunto.trim() && !cuerpo.trim()}
          className="inline-flex items-center gap-2 rounded-lg border border-bac-gray-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-bac-gray-alt disabled:opacity-40"
        >
          <Eye className="h-4 w-4" />
          Vista previa
        </button>
        <button
          onClick={enviar}
          disabled={isPending || destinatarios.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-bac-red px-5 py-2 text-sm font-semibold text-white hover:bg-bac-red-dark disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {isPending ? "Enviando..." : `Enviar a ${destinatarios.length} destinatario${destinatarios.length !== 1 ? "s" : ""}`}
        </button>
      </div>

      {/* Vista previa */}
      {mostrarPreview && (
        <div className="rounded-xl border border-bac-gray-border bg-white overflow-hidden">
          <div className="border-b border-bac-gray-border bg-gray-50 px-4 py-2">
            <p className="text-xs text-bac-gray-text">Vista previa del correo</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="text-xs text-bac-gray-text">
              <span className="font-medium">Para:</span>{" "}
              {destinatarios.map((d) => d.email).join(", ") || "Sin destinatarios"}
            </div>
            <div className="text-xs text-bac-gray-text">
              <span className="font-medium">Asunto:</span> {asunto || "Sin asunto"}
            </div>
            {adjuntos.length > 0 && (
              <div className="text-xs text-bac-gray-text">
                <span className="font-medium">Adjuntos:</span> {adjuntos.map((a) => a.name).join(", ")}
              </div>
            )}
            <hr className="border-bac-gray-border" />
            <div
              className="prose prose-sm max-w-none text-sm text-gray-800"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(cuerpo || "<em>Sin contenido</em>") }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
