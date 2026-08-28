"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { enviarCorreoCompleto } from "@/lib/admin/correos-actions";
import { RichTextEditor } from "@/components/admin/shared/RichTextEditor";
import type { ClienteListItem } from "@/lib/admin/clientes";

export function EnviarCorreoModal({
  cliente,
  onClose,
}: {
  cliente: ClienteListItem;
  onClose: () => void;
}) {
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [adjuntos, setAdjuntos] = useState<{ name: string; file: File }[]>([]);
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<"enviado" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleAttach(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("El archivo no puede superar los 10 MB.");
      return;
    }
    setAdjuntos((prev) => [...prev, { name: file.name, file }]);
  }

  function handleRemoveAttach(idx: number) {
    setAdjuntos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asunto.trim() || !cuerpo.trim()) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("asunto", asunto.trim());
        fd.set("cuerpo", cuerpo);
        fd.set("destinatarios", JSON.stringify([{ email: cliente.email, id: cliente.id }]));
        for (const adj of adjuntos) {
          fd.append("adjuntos", adj.file);
        }
        const res = await enviarCorreoCompleto(fd);
        setResultado(res.errores === 0 ? "enviado" : "error");
        if (res.errores > 0) setErrorMsg("No se pudo enviar el correo.");
      } catch (err) {
        setResultado("error");
        setErrorMsg(err instanceof Error ? err.message : "Error al enviar.");
      }
    });
  }

  return (
    <Modal title={`Enviar correo — ${cliente.nombre_empresa}`} onClose={onClose}>
      {resultado ? (
        <div className="space-y-3 text-sm">
          {resultado === "enviado" ? (
            <p className="text-bac-score-verde">Correo enviado a {cliente.email}.</p>
          ) : (
            <p className="text-bac-score-rojo">
              {errorMsg || "No se pudo enviar: no hay un proveedor de correo configurado."}
            </p>
          )}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-bac-red px-4 py-2 text-sm font-medium text-white hover:bg-bac-red-dark"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-bac-gray-text">Para: {cliente.email}</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Asunto</label>
            <input
              required
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Mensaje</label>
            <RichTextEditor
              value={cuerpo}
              onChange={setCuerpo}
              onAttach={handleAttach}
              attachments={adjuntos.map((a) => ({ name: a.name }))}
              placeholder="Escribe tu mensaje..."
            />
          </div>

          {adjuntos.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Adjuntos:</p>
              {adjuntos.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="truncate flex-1">{a.name}</span>
                  <span className="text-bac-gray-text">{(a.file.size / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttach(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              {isPending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
