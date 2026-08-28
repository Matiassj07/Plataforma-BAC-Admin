"use client";

import { useRef, useCallback } from "react";
import { Bold, Italic, Type, Paperclip } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onAttach?: (file: File) => void;
  attachments?: { name: string; url?: string }[];
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onAttach,
  attachments,
  placeholder = "Escribe tu mensaje...",
  minHeight = "120px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  function handleInput() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  function handleFontSize(size: string) {
    const sizeMap: Record<string, string> = { S: "2", M: "3", L: "5" };
    exec("fontSize", sizeMap[size] ?? "3");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && onAttach) {
      onAttach(file);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="rounded-lg border border-bac-gray-border overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-bac-gray-border bg-gray-50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition"
          title="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition"
          title="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {["S", "M", "L"].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => handleFontSize(size)}
            className="px-1.5 py-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center gap-0.5"
            title={`Tamaño ${size === "S" ? "pequeño" : size === "M" ? "mediano" : "grande"}`}
          >
            <Type className="h-3 w-3" />
            <span className="text-[10px] font-medium">{size}</span>
          </button>
        ))}

        {onAttach && (
          <>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition"
              title="Adjuntar archivo"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value }}
        className="px-3 py-2 text-sm outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        style={{ minHeight }}
      />

      {attachments && attachments.length > 0 && (
        <div className="border-t border-bac-gray-border px-3 py-2 space-y-1">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <Paperclip className="h-3 w-3 text-gray-400" />
              <span className="truncate">{a.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
